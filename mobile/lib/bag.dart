import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import 'shop.dart';

const _wine = Color(0xFF69273A);
const _line = Color(0xFFE5DCD2);
const _paper = Color(0xFFFAF7F2);

class BagScreen extends StatefulWidget {
  const BagScreen({super.key, required this.shop, required this.onShop});

  final Shop shop;
  final VoidCallback onShop;

  @override
  State<BagScreen> createState() => _BagScreenState();
}

class _BagScreenState extends State<BagScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _address = TextEditingController();
  final _city = TextEditingController();
  bool _checkout = false;
  bool _sending = false;
  bool _reenterDetails = false;
  String? _reference;
  String? _error;

  Shop get shop => widget.shop;

  @override
  void dispose() {
    for (final controller in [_name, _phone, _email, _address, _city]) {
      controller.dispose();
    }
    super.dispose();
  }

  void _changeStep(bool checkout) {
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      _checkout = checkout;
      _reenterDetails = checkout && shop.pendingOrder;
      _error = null;
    });
  }

  Future<void> _send({bool retry = false}) async {
    if (_sending || shop.submitting) return;
    if (!retry && !(_form.currentState?.validate() ?? false)) return;
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final reference = retry
          ? await shop.retryOrder()
          : await shop.order(
              name: _name.text.trim(),
              phone: _phone.text.trim(),
              email: _email.text.trim(),
              address: _address.text.trim(),
              city: _city.text.trim(),
            );
      if (!mounted) return;
      TextInput.finishAutofillContext(shouldSave: false);
      for (final controller in [_name, _phone, _email, _address, _city]) {
        controller.clear();
      }
      setState(() {
        _reference = reference;
        _checkout = false;
        _reenterDetails = false;
      });
    } catch (error) {
      if (mounted) setState(() => _error = _errorText(error));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  String _errorText(Object error) {
    final message = error.toString().replaceFirst(
      RegExp(r'^(Exception|Bad state):\s*'),
      '',
    );
    return message.isEmpty
        ? 'La boutique est momentanément indisponible.'
        : message;
  }

  Future<void> _refresh() async {
    setState(() => _error = null);
    try {
      await shop.refresh();
    } catch (error) {
      if (mounted) setState(() => _error = _errorText(error));
    }
  }

  Future<void> _contact() async {
    final mail = Uri(scheme: 'mailto', path: 'benkashoes@gmail.com');
    try {
      if (await launchUrl(mail)) return;
    } catch (_) {
      // The atelier address is still selectable without a mail app.
    }
    if (mounted) {
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Écrire à l’atelier'),
          content: const SelectableText('benkashoes@gmail.com'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Fermer'),
            ),
          ],
        ),
      );
    }
  }

  Future<void> _release() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('L’atelier a-t-il vérifié votre commande ?'),
        content: const Text(
          'Libérez le panier uniquement si l’atelier vous a confirmé qu’aucune commande n’a été enregistrée.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Revenir au suivi'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Oui, l’atelier a vérifié'),
          ),
        ],
      ),
    );
    if (confirmed != true ||
        !mounted ||
        !shop.pendingOrder ||
        shop.submitting) {
      return;
    }
    try {
      await shop.releaseVerifiedAttempt();
      if (mounted) _changeStep(false);
    } catch (error) {
      if (mounted) setState(() => _error = _errorText(error));
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: shop,
      builder: (context, _) {
        final busy = _sending || shop.submitting;
        final cart = shop.cart;
        final unavailable = cart.any(
          (line) => line.quantity > shop.stock(line.id, line.color, line.size),
        );
        final content = <Widget>[];

        final pendingCheck =
            shop.pendingOrder && (!_reenterDetails || !shop.canResumePending);
        if (pendingCheck) {
          content.addAll([
            _heading('Suivi de commande'),
            _notice(
              'Votre commande attend une confirmation de l’atelier. Vérifiez si elle a été reçue.',
            ),
            if (_error != null) _notice(_error!, error: true),
            _primary(
              'Vérifier ma commande',
              busy ? null : () => _send(retry: true),
              busy: busy,
            ),
            if (cart.isNotEmpty && shop.canResumePending)
              TextButton(
                onPressed: busy ? null : () => _changeStep(true),
                child: const Text('Reprendre avec mes coordonnées'),
              ),
            TextButton.icon(
              onPressed: _contact,
              icon: const Icon(Icons.mail_outline),
              label: const Text('Contacter l’atelier'),
            ),
            if (!shop.canResumePending)
              TextButton(
                onPressed: busy ? null : _release,
                child: const Text('Libérer mon panier après vérification'),
              ),
          ]);
        } else if (_reference != null && cart.isEmpty) {
          content.addAll([
            const Icon(Icons.check_circle_outline, color: _wine, size: 48),
            const SizedBox(height: 16),
            _heading('Commande reçue'),
            const Text(
              'Conservez cette référence pour suivre votre commande auprès de l’atelier.',
            ),
            const SizedBox(height: 20),
            _receipt(_reference!),
            const SizedBox(height: 24),
            _primary('Retour à la collection', () {
              setState(() => _reference = null);
              widget.onShop();
            }),
          ]);
        } else if (cart.isEmpty && shop.loading && !shop.ready) {
          content.addAll([
            _heading('Mon panier'),
            const LinearProgressIndicator(),
          ]);
        } else if (cart.isEmpty) {
          content.addAll([
            _heading('Mon panier'),
            const SizedBox(height: 10),
            const Align(
              alignment: Alignment.centerLeft,
              child: Icon(Icons.shopping_bag_outlined, color: _wine, size: 38),
            ),
            const SizedBox(height: 16),
            Text(
              'Votre panier est vide.',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 20),
            _primary('Découvrir la collection', widget.onShop),
            if (shop.lastReference != null) ...[
              const SizedBox(height: 28),
              _receipt(shop.lastReference!, label: 'Dernière commande'),
            ],
          ]);
        } else if (_checkout) {
          content.addAll([
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: busy ? null : () => _changeStep(false),
                icon: const Icon(Icons.arrow_back, size: 18),
                label: Text(
                  shop.pendingOrder ? 'Suivi de commande' : 'Mon panier',
                ),
              ),
            ),
            _heading('Livraison'),
            if (shop.pendingOrder)
              _notice(
                'Utilisez les mêmes coordonnées que lors du premier envoi pour retrouver votre commande.',
              ),
            _deliveryForm(busy),
            const SizedBox(height: 24),
            if (shop.pendingOrder)
              _amountRow('Montant de la commande', '${shop.total} DH')
            else
              _summary(),
            if (_error != null) _notice(_error!, error: true),
            if (!shop.ready && !shop.pendingOrder) _connectionNotice(),
            if (!shop.pendingOrder && shop.ready && unavailable) ...[
              _notice(
                'Une pointure n’est plus disponible dans la quantité choisie.',
              ),
              TextButton(
                onPressed: busy ? null : () => _changeStep(false),
                child: const Text('Ajuster mon panier'),
              ),
            ],
            _primary(
              'Confirmer la commande · ${shop.total} DH',
              busy || (!shop.pendingOrder && (!shop.ready || unavailable))
                  ? null
                  : () => _send(),
              busy: busy,
            ),
          ]);
        } else {
          final count = cart.fold<int>(0, (sum, line) => sum + line.quantity);
          content.addAll([
            _heading(
              'Mon panier',
              detail: '$count ${count == 1 ? 'paire' : 'paires'}',
            ),
            for (final item in cart)
              _BagLine(shop: shop, item: item, enabled: !busy),
            const SizedBox(height: 24),
            _summary(),
            if (!shop.ready) _connectionNotice(),
            if (_error != null) _notice(_error!, error: true),
            _primary(
              'Passer à la livraison',
              busy || !shop.ready || unavailable
                  ? null
                  : () => _changeStep(true),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: busy ? null : widget.onShop,
              child: const Text('Continuer mes achats'),
            ),
          ]);
        }

        return SafeArea(
          bottom: false,
          child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 600),
              child: ListView(
                key: ValueKey(
                  pendingCheck
                      ? 'pending'
                      : _checkout
                      ? 'delivery'
                      : 'bag',
                ),
                padding: const EdgeInsets.fromLTRB(22, 24, 22, 28),
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                children: content,
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _heading(String text, {String? detail}) {
    final theme = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Wrap(
        spacing: 12,
        runSpacing: 4,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          Semantics(
            header: true,
            child: Text(text, style: theme.headlineMedium),
          ),
          if (detail != null) Text(detail, style: theme.bodyMedium),
        ],
      ),
    );
  }

  Widget _receipt(String reference, {String label = 'Référence de commande'}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _paper,
        border: Border.all(color: _line),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 5),
          SelectableText(
            reference,
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ],
      ),
    );
  }

  Widget _notice(String text, {bool error = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Semantics(
        liveRegion: true,
        child: Text(
          text,
          style: TextStyle(
            color: error ? Theme.of(context).colorScheme.error : null,
          ),
        ),
      ),
    );
  }

  Widget _connectionNotice() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _notice(
          shop.loading
              ? 'Vérification des disponibilités…'
              : 'Une connexion Internet est nécessaire pour vérifier le stock et commander.',
        ),
        if (!shop.loading)
          TextButton.icon(
            onPressed: _refresh,
            icon: const Icon(Icons.refresh),
            label: const Text('Actualiser le stock'),
          ),
      ],
    );
  }

  Widget _summary() {
    final discount = shop.subtotal - shop.total;
    final title = Theme.of(
      context,
    ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _amountRow('Articles', '${shop.subtotal} DH'),
        if (discount > 0)
          _amountRow(
            shop.packName ?? 'Remise Black Friday',
            '−$discount DH',
            style: const TextStyle(color: _wine, fontWeight: FontWeight.w600),
          ),
        _amountRow('Livraison au Maroc', 'Offerte'),
        const Divider(height: 22, color: _line),
        _amountRow('Total à la livraison', '${shop.total} DH', style: title),
        const SizedBox(height: 18),
      ],
    );
  }

  Widget _amountRow(String label, String value, {TextStyle? style}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: Text(label, style: style)),
          const SizedBox(width: 14),
          Text(value, style: style),
        ],
      ),
    );
  }

  Widget _primary(String label, VoidCallback? onPressed, {bool busy = false}) {
    return FilledButton(
      onPressed: onPressed,
      style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50)),
      child: busy
          ? Semantics(
              label: 'Envoi en cours',
              child: const SizedBox.square(
                dimension: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          : Text(label, textAlign: TextAlign.center),
    );
  }

  Widget _deliveryForm(bool busy) {
    return Form(
      key: _form,
      autovalidateMode: AutovalidateMode.onUserInteraction,
      child: AutofillGroup(
        child: Column(
          children: [
            _field(
              'Nom et prénom',
              _name,
              80,
              enabled: !busy,
              hints: const [AutofillHints.name],
              caps: TextCapitalization.words,
            ),
            _field(
              'Téléphone',
              _phone,
              20,
              enabled: !busy,
              hints: const [AutofillHints.telephoneNumber],
              type: TextInputType.phone,
              validator: (text) {
                final phone = (text ?? '').trim();
                if (!RegExp(r'^[0-9+().\s-]{8,20}$').hasMatch(phone) ||
                    !RegExp(
                      r'^\d{8,15}$',
                    ).hasMatch(phone.replaceAll(RegExp(r'\D'), ''))) {
                  return 'Indiquez un numéro de téléphone valide.';
                }
                return null;
              },
            ),
            _field(
              'Adresse e-mail',
              _email,
              120,
              enabled: !busy,
              hints: const [AutofillHints.email],
              type: TextInputType.emailAddress,
              validator: (text) =>
                  RegExp(
                    r'^[^@\s]+@[^@\s]+\.[^@\s]{2,}$',
                  ).hasMatch((text ?? '').trim())
                  ? null
                  : 'Indiquez une adresse e-mail valide.',
            ),
            _field(
              'Adresse de livraison',
              _address,
              200,
              enabled: !busy,
              hints: const [AutofillHints.fullStreetAddress],
              type: TextInputType.streetAddress,
              caps: TextCapitalization.sentences,
            ),
            _field(
              'Ville',
              _city,
              80,
              enabled: !busy,
              hints: const [AutofillHints.addressCity],
              caps: TextCapitalization.words,
              action: TextInputAction.done,
            ),
          ],
        ),
      ),
    );
  }

  Widget _field(
    String label,
    TextEditingController controller,
    int limit, {
    required bool enabled,
    required List<String> hints,
    TextInputType? type,
    TextCapitalization caps = TextCapitalization.none,
    TextInputAction action = TextInputAction.next,
    FormFieldValidator<String>? validator,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: controller,
        enabled: enabled,
        autofillHints: hints,
        keyboardType: type,
        textCapitalization: caps,
        textInputAction: action,
        maxLength: limit,
        validator:
            validator ??
            (text) =>
                (text ?? '').trim().isEmpty ? 'Renseignez ce champ.' : null,
        decoration: InputDecoration(labelText: label, counterText: ''),
      ),
    );
  }
}

class _BagLine extends StatelessWidget {
  const _BagLine({
    required this.shop,
    required this.item,
    required this.enabled,
  });

  final Shop shop;
  final CartLine item;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final product = shop.products.firstWhere(
      (product) => product.id == item.id,
    );
    final theme = Theme.of(context).textTheme;
    final stock = shop.stock(item.id, item.color, item.size);
    final missing = shop.ready && item.quantity > stock;
    void quantity(int value) {
      shop.setQuantity(item.id, item.color, item.size, value);
    }

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: _line)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.asset(
                  'assets/products/${item.id}-${item.color}.jpg',
                  width: 74,
                  height: 88,
                  fit: BoxFit.cover,
                  excludeFromSemantics: true,
                  errorBuilder: (_, error, trace) => const SizedBox(
                    width: 74,
                    height: 88,
                    child: ColoredBox(
                      color: _paper,
                      child: Icon(Icons.shopping_bag_outlined, color: _wine),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      style: theme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${colorName(item.color)} · Pointure ${item.size}',
                      style: theme.bodyMedium,
                    ),
                    const SizedBox(height: 5),
                    Text('${product.price} DH / paire', style: theme.bodySmall),
                  ],
                ),
              ),
              IconButton(
                tooltip:
                    'Retirer ${product.name}, ${colorName(item.color)}, pointure ${item.size}',
                onPressed: enabled ? () => quantity(0) : null,
                icon: const Icon(Icons.close, size: 19),
              ),
            ],
          ),
          const SizedBox(height: 5),
          Row(
            children: [
              IconButton(
                tooltip: 'Diminuer la quantité',
                onPressed: enabled && item.quantity > 1
                    ? () => quantity(item.quantity - 1)
                    : null,
                icon: const Icon(Icons.remove, size: 18),
              ),
              Semantics(
                label: 'Quantité',
                child: Text('${item.quantity}', style: theme.titleSmall),
              ),
              IconButton(
                tooltip: 'Augmenter la quantité',
                onPressed:
                    enabled &&
                        shop.ready &&
                        item.quantity < stock &&
                        item.quantity < 10
                    ? () => quantity(item.quantity + 1)
                    : null,
                icon: const Icon(Icons.add, size: 18),
              ),
              const Spacer(),
              Text(
                '${item.quantity * product.price} DH',
                style: theme.titleSmall,
              ),
            ],
          ),
          if (missing)
            TextButton(
              onPressed: enabled ? () => quantity(stock) : null,
              child: Text(
                stock == 0
                    ? 'Épuisé · Retirer la paire'
                    : 'Ajuster aux $stock paires disponibles',
              ),
            ),
        ],
      ),
    );
  }
}
