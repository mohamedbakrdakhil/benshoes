import 'dart:async';
import 'dart:convert';

import 'package:boutique/shop.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

http.Response jsonReply(Object data) =>
    http.Response.bytes(utf8.encode(jsonEncode(data)), 200);
Map<String, dynamic> liveData({int opus = 279}) => {
  'methode': 'POST',
  'catalogue': {
    'as': {'prix': 299},
    'opus': {'prix': opus},
  },
  'promotion': {
    'packsVersion': 'bf-trios-opus-as-mixte-v3',
    'quantite': 3,
    'quantiteExacte': true,
    'livraison': 0,
    'packs': {'opus': 699, 'as': 799, 'mixte': 749},
  },
  'stock': {
    'opus': {
      for (final c in [
        'beige',
        'taupe',
        'marron',
        'tabac',
        'burgundy',
        'gris',
        'marine',
        'noir',
      ])
        c: [2, 5, 3, 1, 0],
    },
    'as': {
      for (final c in ['camel', 'cognac', 'noir', 'chocolat'])
        c: [12, 11, 11, 10, 12],
    },
  },
};

Future<String> buy(Shop shop, {String name = 'Acheteur Test'}) => shop.order(
  name: name,
  email: 'test@example.com',
  phone: '0612345678',
  address: '23 rue des tests',
  city: 'Fès',
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late SharedPreferences prefs;
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
  });

  test(
    'stock validé par pointure et trois tarifs pour exactement trois paires',
    () async {
      final shop = Shop(
        prefs: prefs,
        client: MockClient((_) async => jsonReply(liveData())),
      );
      await shop.initialize();
      expect(shop.ready, isTrue);
      expect(shop.add('opus', 'noir', 41), isFalse);
      expect(shop.add('opus', 'inconnu', 38), isFalse);
      shop.setQuantity('as', 'noir', 37, 11);
      expect(shop.cart, isEmpty);
      shop.setQuantity('as', 'noir', 37, 3);
      expect(
        [shop.total, shop.subtotal, shop.packName],
        [799, 897, 'Trio AS by BENKA'],
      );
      shop.setQuantity('as', 'noir', 37, 4);
      expect([shop.total, shop.packName], [1196, null]);
      shop.setQuantity('as', 'noir', 37, 2);
      shop.add('opus', 'beige', 38);
      expect(shop.total, 749);
      shop.setQuantity('as', 'noir', 37, 0);
      shop.setQuantity('opus', 'beige', 38, 3);
      expect(shop.total, 699);
      shop.setQuantity('opus', 'beige', 38, 6);
      expect(shop.cart.single.quantity, 3);
      shop.toggleFavorite('opus', 'beige');
      await Future<void>.delayed(Duration.zero);
      final restored = Shop(
        prefs: prefs,
        client: MockClient((_) async => jsonReply(liveData())),
      );
      await restored.initialize();
      expect(restored.total, 699);
      expect(restored.isFavorite('opus', 'beige'), isTrue);
    },
  );

  test('stock ou promo mal formés : achat bloqué, panier conservé', () async {
    final wire = liveData();
    var posts = 0;
    final shop = Shop(
      prefs: prefs,
      client: MockClient((r) async {
        if (r.method == 'POST') posts++;
        return jsonReply(wire);
      }),
    );
    await shop.initialize();
    shop.add('as', 'noir', 38);
    wire['stock']['as']['noir'] = [0, 1];
    await shop.refresh();
    expect(shop.ready, isFalse);
    expect(shop.stock('as', 'noir', 38), 0);
    expect(shop.packPrices, isEmpty);
    expect(shop.add('as', 'noir', 38), isFalse);
    await expectLater(buy(shop), throwsA(isA<ShopError>()));
    expect(posts, 0);
    expect(shop.cart.single.quantity, 1);
    wire['stock'] = liveData()['stock'];
    wire['promotion']['packsVersion'] = 'incompatible';
    await shop.refresh();
    expect(shop.ready, isFalse);
  });

  test('relecture avant envoi si prix ou stock change', () async {
    int price = 279, posts = 0;
    var soldOut = false;
    final shop = Shop(
      prefs: prefs,
      client: MockClient((r) async {
        if (r.method == 'POST') posts++;
        final wire = liveData(opus: price);
        if (soldOut) wire['stock']['opus']['beige'] = [0, 0, 0, 0, 0];
        return jsonReply(wire);
      }),
    );
    await shop.initialize();
    shop.add('opus', 'beige', 37);
    price = 280;
    await expectLater(buy(shop), throwsA(isA<ShopError>()));
    expect(shop.total, 280);
    soldOut = true;
    await expectLater(buy(shop), throwsA(isA<ShopError>()));
    expect(posts, 0);
  });

  test(
    'redirection Apps Script POST puis GET, reçu obligatoire et stock relu',
    () async {
      final posts = <Map<String, dynamic>>[];
      var receipts = 0;
      final shop = Shop(
        prefs: prefs,
        client: MockClient((r) async {
          if (r.url.host == 'script.googleusercontent.com') {
            expect(r.method, 'GET');
            expect(r.body, isEmpty);
            receipts++;
            return jsonReply({
              'ok': true,
              'ref': 'BS-2611-ACDEF',
              'total': 749,
            });
          }
          if (r.method == 'POST') {
            posts.add(jsonDecode(r.body));
            return http.Response(
              '',
              302,
              headers: {
                'location':
                    'https://script.googleusercontent.com/macros/echo?receipt=sample',
              },
            );
          }
          return jsonReply(liveData());
        }),
      );
      await shop.initialize();
      shop.setQuantity('as', 'noir', 38, 2);
      shop.add('opus', 'beige', 37);
      expect(await buy(shop), 'BS-2611-ACDEF');
      expect(posts.single['expectedTotal'], 749);
      expect(posts.single['items'][0], {
        'id': 'as',
        'colorKey': 'noir',
        'size': 38,
        'q': 2,
      });
      expect(posts.single['customer']['email'], 'test@example.com');
      expect(posts.single['source'], 'benka-mobile');
      expect(receipts, 1);
      expect(shop.cart, isEmpty);
      expect(shop.lastReference, 'BS-2611-ACDEF');
      expect(shop.pendingOrder, isFalse);
    },
  );

  test(
    'réponse perdue, redémarrage et vérification de clé sans nouvel achat',
    () async {
      final sent = <Map<String, dynamic>>[];
      final client = MockClient((r) async {
        if (r.method == 'GET') return jsonReply(liveData());
        sent.add(jsonDecode(r.body));
        if (sent.length == 1) throw http.ClientException('offline');
        return jsonReply({'ok': true, 'ref': 'BS-2611-ACDEF', 'deja': true});
      });
      final first = Shop(prefs: prefs, client: client);
      await first.initialize();
      first.add('opus', 'beige', 37);
      await expectLater(buy(first), throwsA(isA<ShopError>()));
      final stored = prefs.getString('benka.shop.v1')!;
      expect(stored, isNot(contains('test@example.com')));
      expect(stored, isNot(contains('23 rue des tests')));
      expect(first.pendingOrder, isTrue);
      final reopened = Shop(prefs: prefs, client: client);
      await reopened.initialize();
      expect(reopened.add('opus', 'beige', 37), isFalse);
      expect(await reopened.retryOrder(), 'BS-2611-ACDEF');
      expect(sent[1]['items'], isEmpty);
      expect(sent[0]['cle'], sent[1]['cle']);
    },
  );

  test(
    'erreur après écriture : une seule demande créatrice, même après redémarrage',
    () async {
      final sent = <Map<String, dynamic>>[];
      final gate = Completer<void>();
      final client = MockClient((r) async {
        if (r.method == 'GET') return jsonReply(liveData());
        final body = jsonDecode(r.body) as Map<String, dynamic>;
        sent.add(body);
        if ((body['items'] as List).isEmpty)
          return jsonReply({'erreur': 'Panier vide.'});
        await gate.future;
        return jsonReply({'erreur': 'Erreur du serveur.'});
      });
      final shop = Shop(prefs: prefs, client: client);
      await shop.initialize();
      shop.add('as', 'noir', 37);
      final attempt = buy(shop);
      await expectLater(buy(shop), throwsA(isA<ShopError>()));
      gate.complete();
      await expectLater(attempt, throwsA(isA<ShopError>()));
      expect(shop.pendingOrder, isTrue);
      await expectLater(buy(shop), throwsA(isA<ShopError>()));
      final reopened = Shop(prefs: prefs, client: client);
      await reopened.initialize();
      await expectLater(
        buy(reopened, name: 'Autre'),
        throwsA(isA<ShopError>()),
      );
      await expectLater(reopened.retryOrder(), throwsA(isA<ShopError>()));
      expect(sent.where((r) => (r['items'] as List).isNotEmpty), hasLength(1));
      expect(sent.map((r) => r['cle']).toSet(), hasLength(1));
      expect(reopened.pendingOrder, isTrue);
      await reopened.releaseVerifiedAttempt();
      expect(reopened.pendingOrder, isFalse);
      expect(reopened.cart.single.quantity, 1);
    },
  );

  test(
    'prix unitaire modifié : seuls les trios des modèles au tarif autorisé sont proposés',
    () async {
      final shop = Shop(
        prefs: prefs,
        client: MockClient((_) async => jsonReply(liveData(opus: 280))),
      );
      await shop.initialize();
      shop.setQuantity('opus', 'beige', 38, 3);
      expect(shop.total, 840);
      expect(shop.packName, isNull);
      shop.setQuantity('opus', 'beige', 38, 2);
      shop.add('as', 'noir', 39);
      expect(shop.total, 859);
      expect(shop.packName, isNull);
      shop.setQuantity('opus', 'beige', 38, 0);
      shop.setQuantity('as', 'noir', 39, 3);
      expect(shop.total, 799);
      expect(shop.packPrices, {'as': 799});
    },
  );

  test(
    'un refus de stock conserve le panier et permet de modifier sa quantité',
    () async {
      final shop = Shop(
        prefs: prefs,
        client: MockClient(
          (r) async => r.method == 'GET'
              ? jsonReply(liveData())
              : jsonReply({'erreur': 'Stock insuffisant.'}),
        ),
      );
      await shop.initialize();
      shop.add('as', 'noir', 37);
      await expectLater(buy(shop), throwsA(isA<ShopError>()));
      expect(shop.pendingOrder, isFalse);
      expect(shop.lastReference, isNull);
      shop.setQuantity('as', 'noir', 37, 0);
      expect(shop.cart, isEmpty);
    },
  );
}
