import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const _service =
    'https://script.google.com/macros/s/AKfycbyKIXldC3avykJrboBcLLyYBL0xjefbvN7sZXuF55bztMTadznsNQL7XruExX-1mhPj/exec';
const _storageKey = 'benka.shop.v1';
const _promoVersion = 'bf-trios-opus-as-mixte-v3';
const _colorNames = {
  'beige': 'Beige',
  'taupe': 'Marron taupe',
  'marron': 'Marron',
  'tabac': 'Tabac',
  'burgundy': 'Burgundy',
  'gris': 'Gris',
  'marine': 'Marine',
  'noir': 'Noir',
  'camel': 'Camel',
  'cognac': 'Cognac',
  'chocolat': 'Chocolat',
};
String colorName(String key) => _colorNames[key] ?? key;

class Product {
  const Product(
    this.id,
    this.name,
    this.subtitle,
    this.description,
    this.colors,
    this.price,
  );
  final String id, name, subtitle, description;
  final List<String> colors;
  final int price;
  String photo(String color) => id == 'as'
      ? 'https://www.benkashoes.ma/assets/as-by-benka/$color-640.webp'
      : 'https://www.benkashoes.ma/assets/produits/opus-$color-1-640.webp';
  Product _withPrice(int value) =>
      Product(id, name, subtitle, description, colors, value);
}

const _catalog = [
  Product(
    'opus',
    'Opus',
    'Mocassin-mule à bride penny',
    'Une bride ajourée, un talon ouvert et un daim souple monté à la main sur forme.',
    ['beige', 'taupe', 'marron', 'tabac', 'burgundy', 'gris', 'marine', 'noir'],
    279,
  ),
  Product(
    'as',
    'AS by BENKA',
    'Mule à boucle et clous argentés',
    'Une boucle affirmée, une bride ponctuée de clous argentés et un bout fermé aux lignes arrondies.',
    ['camel', 'cognac', 'noir', 'chocolat'],
    299,
  ),
];

class CartLine {
  const CartLine(this.id, this.color, this.size, this.quantity);
  final String id, color;
  final int size, quantity;
  String get _key => '$id/$color/$size';
  Map<String, dynamic> toJson() => {
    'id': id,
    'colorKey': color,
    'size': size,
    'q': quantity,
  };
}

class ShopError implements Exception {
  const ShopError(this.message);
  final String message;
  @override
  String toString() => message;
}

class Shop extends ChangeNotifier {
  Shop({http.Client? client, SharedPreferences? prefs})
    : _client = client ?? http.Client(),
      _ownsClient = client == null,
      _prefs = prefs;

  final http.Client _client;
  final bool _ownsClient;
  SharedPreferences? _prefs;
  Future<void>? _initialization, _refreshing;
  Future<void> _writing = Future.value();
  bool _disposed = false,
      _localReady = false,
      _hasStock = false,
      _submitting = false;
  List<Product> _products = _catalog;
  final Map<String, CartLine> _cart = {};
  final Set<String> _favorites = {};
  Map<String, int> _stock = {}, _packs = {};
  Map<String, dynamic>? _pending;
  String? _reference, _problem;

  List<Product> get products => _products;
  List<CartLine> get cart => List.unmodifiable(_cart.values);
  Map<String, int> get packPrices => Map.unmodifiable(_packs);
  bool get ready => _localReady && _hasStock;
  bool get loading => _refreshing != null || !_localReady && _problem == null;
  bool get submitting => _submitting;
  bool get pendingOrder => _pending != null;
  bool get canResumePending => false;
  int? get pendingTotal => _pending?['total'] as int?;
  String? get lastReference => _reference;
  String? get problem => _problem;
  int stock(String id, String color, int size) =>
      _hasStock ? _stock['$id/$color/$size'] ?? 0 : 0;
  int inCart(String id, String color, int size) =>
      _cart['$id/$color/$size']?.quantity ?? 0;
  bool isFavorite(String id, String color) => _favorites.contains('$id/$color');
  int get _count => _cart.values.fold(0, (n, line) => n + line.quantity);
  int get subtotal =>
      _pending?['gross'] as int? ??
      _cart.values.fold(
        0,
        (n, line) => n + _product(line.id).price * line.quantity,
      );
  String? get _pack {
    if (_count != 3 || _packs.isEmpty) return null;
    final ids = _cart.values.map((line) => line.id).toSet();
    final key = ids.length == 1 ? ids.first : 'mixte';
    return _packs.containsKey(key) ? key : null;
  }

  String? get packName => const {
    'opus': 'Trio Opus',
    'as': 'Trio AS by BENKA',
    'mixte': 'Trio mixte',
  }[_pending?['pack'] ?? _pack];
  int get total => _pending?['total'] as int? ?? _packs[_pack] ?? subtotal;
  Product _product(String id) => _products.firstWhere((item) => item.id == id);
  bool _known(String id, String color) =>
      _catalog.any((p) => p.id == id && p.colors.contains(color));

  Future<void> initialize() => _initialization ??= _initialize();
  Future<void> _initialize() async {
    try {
      _prefs ??= await SharedPreferences.getInstance();
      final text = _prefs!.getString(_storageKey);
      if (text != null) {
        final data = jsonDecode(text) as Map<String, dynamic>;
        final saved = data['cart'] as List;
        for (final item in saved) {
          final line = CartLine(
            item['id'],
            item['colorKey'],
            item['size'],
            item['q'],
          );
          if (_known(line.id, line.color) &&
              line.size >= 37 &&
              line.size <= 41 &&
              line.quantity >= 1 &&
              line.quantity <= 10 &&
              _cart.length < 20) {
            _cart[line._key] = line;
          }
        }
        _favorites.addAll((data['favorites'] as List).whereType<String>());
        _pending = data['pending'] as Map<String, dynamic>?;
        _reference = data['reference'] as String?;
      }
      _localReady = true;
    } catch (_) {
      _problem = 'Le panier enregistré sur cet appareil est indisponible.';
      _changed();
      return;
    }
    await refresh();
  }

  Future<void> _persist() {
    final prefs = _prefs!;
    final text = jsonEncode({
      'cart': _cart.values.map((line) => line.toJson()).toList(),
      'favorites': _favorites.toList(),
      'pending': _pending,
      'reference': _reference,
    });
    final save = _writing.then((_) async {
      if (!await prefs.setString(_storageKey, text)) {
        throw const ShopError(
          'Le panier n’a pas pu être enregistré sur cet appareil.',
        );
      }
    });
    _writing = save.catchError((Object _) {});
    return save;
  }

  void _saveEdit() {
    unawaited(
      _persist().catchError((Object _) {
        _problem = 'Le panier n’a pas pu être enregistré sur cet appareil.';
        _changed();
      }),
    );
    _changed();
  }

  void toggleFavorite(String id, String color) {
    if (!_localReady || !_known(id, color)) return;
    final key = '$id/$color';
    if (!_favorites.remove(key)) _favorites.add(key);
    _saveEdit();
  }

  bool add(String id, String color, int size) {
    final q = inCart(id, color, size) + 1;
    if (!ready ||
        _submitting ||
        pendingOrder ||
        q > min(10, stock(id, color, size)) ||
        q == 1 && _cart.length >= 20) {
      return false;
    }
    setQuantity(id, color, size, q);
    return true;
  }

  void setQuantity(String id, String color, int size, int quantity) {
    if (!_localReady ||
        _submitting ||
        pendingOrder ||
        !_known(id, color) ||
        size < 37 ||
        size > 41) {
      return;
    }
    final previous = inCart(id, color, size);
    if (quantity == previous ||
        quantity < 0 ||
        quantity > 10 ||
        quantity > previous &&
            (!ready ||
                quantity > stock(id, color, size) ||
                previous == 0 && _cart.length >= 20)) {
      return;
    }
    final line = CartLine(id, color, size, quantity);
    if (quantity == 0) {
      _cart.remove(line._key);
    } else {
      _cart[line._key] = line;
    }
    _saveEdit();
  }

  Future<void> refresh() {
    final ongoing = _refreshing;
    if (ongoing != null) return ongoing;
    final future = _fetchCatalog();
    _refreshing = future;
    _changed();
    return future.whenComplete(() {
      _refreshing = null;
      _changed();
    });
  }

  Future<void> _fetchCatalog() async {
    try {
      final data = await _request();
      if (data['methode'] != 'POST') throw const FormatException();
      final entries = data['catalogue'] as Map;
      final quantities = data['stock'] as Map;
      final counts = <String, int>{};
      final latest = <Product>[];
      for (final p in _catalog) {
        final info = entries[p.id] as Map?;
        final price = info == null && p.id == 'opus' ? p.price : info?['prix'];
        if (price is! int || price <= 0) throw const FormatException();
        latest.add(p._withPrice(price));
        for (final color in p.colors) {
          final row = quantities[p.id][color] as List;
          if (row.length != 5) throw const FormatException();
          for (var i = 0; i < row.length; i++) {
            final qty = row[i];
            if (qty is! int || qty < 0) throw const FormatException();
            counts['${p.id}/$color/${37 + i}'] = qty;
          }
        }
      }
      final packs = <String, int>{};
      final promo = data['promotion'] as Map?;
      if (promo != null) {
        if (promo['packsVersion'] != _promoVersion ||
            promo['quantiteExacte'] != true ||
            promo['quantite'] != 3 ||
            promo['livraison'] != 0) {
          throw const FormatException();
        }
        for (final id in ['opus', 'as', 'mixte']) {
          final amount = promo['packs'][id];
          if (amount is! int || amount <= 0) throw const FormatException();
          packs[id] = amount;
        }
      }
      // The deployed pricing rule applies only to Opus at 279 and AS at 299.
      for (final p in latest) {
        if (p.price != (p.id == 'opus' ? 279 : 299)) {
          packs.remove(p.id);
          packs.remove('mixte');
        }
      }
      _stock = counts;
      _products = List.unmodifiable(latest);
      _packs = packs;
      _hasStock = true;
      _problem = null;
    } catch (_) {
      _hasStock = false;
      _packs = {};
      _problem =
          'Le stock est momentanément indisponible. Vérifiez votre connexion puis réessayez.';
    }
  }

  Future<Map<String, dynamic>> _request([Map<String, dynamic>? payload]) async {
    Future<Map<String, dynamic>> send() async {
      var uri = Uri.parse(_service);
      var method = payload == null ? 'GET' : 'POST';
      for (var i = 0; i < 4; i++) {
        final req = http.Request(method, uri)..followRedirects = kIsWeb;
        if (method == 'POST') {
          req.headers['content-type'] = 'text/plain; charset=utf-8';
          req.body = jsonEncode(payload);
        }
        final res = await http.Response.fromStream(await _client.send(req));
        // Apps Script runs doPost once, then serves its JSON from a second host via GET.
        if ([301, 302, 303, 307, 308].contains(res.statusCode)) {
          final location = res.headers['location'];
          if (location == null || method == 'POST' && res.statusCode >= 307) {
            throw const FormatException();
          }
          uri = uri.resolve(location);
          if (uri.scheme != 'https' ||
              ![
                'script.google.com',
                'script.googleusercontent.com',
              ].contains(uri.host) ||
              uri.userInfo.isNotEmpty ||
              uri.port != 443) {
            throw const FormatException();
          }
          method = 'GET';
          continue;
        }
        if (res.statusCode != 200) throw const FormatException();
        return jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      }
      throw const FormatException();
    }

    return send().timeout(const Duration(seconds: 30));
  }

  static final _validRef = RegExp(r'^BS-\d{4}-[A-Z0-9]{5,16}$');
  static final _email = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]{2,}$');
  static final _phone = RegExp(r'^[0-9+().\s-]{8,20}$');
  Future<String> order({
    required String name,
    required String email,
    required String phone,
    required String address,
    required String city,
  }) async {
    if (_submitting) throw const ShopError('Une commande est déjà en cours.');
    if (pendingOrder) return retryOrder();
    if (!_localReady || _cart.isEmpty) {
      throw const ShopError('Votre panier est indisponible.');
    }
    final customer = {
      'name': name.trim(),
      'phone': phone.trim(),
      'email': email.trim(),
      'addr': address.trim(),
      'city': city.trim(),
      'country': 'Maroc',
    };
    if (customer.values.any((s) => s.isEmpty) ||
        name.trim().length > 80 ||
        address.trim().length > 200 ||
        city.trim().length > 80 ||
        email.trim().length > 120 ||
        !_email.hasMatch(email.trim()) ||
        !_phone.hasMatch(phone.trim()) ||
        !RegExp(r'^\d{8,15}$').hasMatch(phone.replaceAll(RegExp(r'\D'), ''))) {
      throw const ShopError(
        'Vérifiez vos coordonnées de livraison et votre e-mail.',
      );
    }
    _submitting = true;
    _changed();
    try {
      final displayed = total;
      await refresh();
      if (!ready) throw ShopError(_problem ?? 'Stock indisponible.');
      if (total != displayed) {
        throw const ShopError(
          'Le prix a changé. Vérifiez le total puis confirmez à nouveau.',
        );
      }
      for (final item in _cart.values) {
        if (stock(item.id, item.color, item.size) < item.quantity) {
          throw ShopError(
            'Ajustez la quantité de ${_product(item.id).name} ${colorName(item.color)}, pointure ${item.size}.',
          );
        }
      }
      final rng = Random.secure();
      final key = List.generate(
        16,
        (_) => rng.nextInt(256).toRadixString(16).padLeft(2, '0'),
      ).join();
      final draft = <String, dynamic>{
        'source': 'benka-mobile',
        'cle': key,
        'items': _cart.values.map((line) => line.toJson()).toList(),
        'customer': customer,
        'expectedTotal': total,
        'pricingVersion': _promoVersion,
      };
      _pending = {'key': key, 'total': total, 'gross': subtotal, 'pack': _pack};
      try {
        // Save before issuing the only request ever allowed to create this order.
        await _persist();
      } catch (_) {
        _pending = null;
        throw const ShopError(
          'Impossible de sauvegarder le panier. La commande n’a pas été envoyée.',
        );
      }
      return await _submit(draft, lookup: false);
    } finally {
      _submitting = false;
      _changed();
    }
  }

  /// A receipt lookup uses the server's key check before its empty-cart validation.
  /// Even after the deduplication window closes, this request cannot place an order.
  Future<String> retryOrder() async {
    if (_submitting || !pendingOrder) {
      throw const ShopError('Aucune tentative à vérifier pour le moment.');
    }
    _submitting = true;
    _changed();
    try {
      return await _submit({
        'source': 'benka-mobile',
        'cle': _pending!['key'],
        'items': [],
      }, lookup: true);
    } finally {
      _submitting = false;
      _changed();
    }
  }

  Future<String> _submit(
    Map<String, dynamic> payload, {
    required bool lookup,
  }) async {
    Map<String, dynamic> reply;
    try {
      reply = await _request(payload);
    } catch (_) {
      throw const ShopError(
        'Réception à vérifier. Votre panier est conservé. Utilisez la vérification de commande.',
      );
    }
    final ref = reply['ref'];
    if (reply['ok'] == true && ref is String && _validRef.hasMatch(ref)) {
      _reference = ref;
      _pending = null;
      _cart.clear();
      await _persist();
      await refresh();
      return ref;
    }
    final error = reply['erreur'];
    if (lookup) {
      throw const ShopError(
        'La réception reste à vérifier avec l’atelier. Votre panier est conservé.',
      );
    }
    if (error is String && error.isNotEmpty && error != 'Erreur du serveur.') {
      _pending = null;
      await _persist();
      await refresh();
      throw ShopError(error);
    }
    throw const ShopError(
      'Réception à vérifier auprès de l’atelier. Votre panier est conservé.',
    );
  }

  /// Call only after the customer has checked with the atelier that a pending order can be abandoned.
  Future<void> releaseVerifiedAttempt() async {
    if (_submitting || !pendingOrder) return;
    _pending = null;
    await _persist();
    _changed();
  }

  void _changed() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    if (_ownsClient) _client.close();
    super.dispose();
  }
}
