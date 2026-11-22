import 'dart:math' as math;
import 'package:flutter/material.dart';

import 'shop.dart';

const _ink = Color(0xff241a17);
const _paper = Color(0xfffaf7f2);
const _wine = Color(0xff782b38);
const _muted = Color(0xff6b605a);
const _line = Color(0xffded7cf);
const _swatches = {
  'camel': Color(0xffa17a40),
  'cognac': Color(0xff824a2a),
  'chocolat': Color(0xff47302c),
  'noir': Color(0xff272421),
  'beige': Color(0xffcdb595),
  'marron': Color(0xff6b4529),
  'taupe': Color(0xff837567),
  'tabac': Color(0xff9a6433),
  'burgundy': Color(0xff8e3b40),
  'gris': Color(0xff7e8389),
  'marine': Color(0xff27374f),
};
const _sizes = [37, 38, 39, 40, 41];
typedef _Variant = ({Product product, String color});

TextStyle _title(BuildContext context, double size) =>
    (Theme.of(context).textTheme.displaySmall ?? const TextStyle()).copyWith(
      fontSize: size,
      height: 1.04,
      color: _ink,
      fontWeight: FontWeight.w500,
      letterSpacing: -0.6,
    );

class BoutiqueScreen extends StatefulWidget {
  const BoutiqueScreen({
    super.key,
    required this.shop,
    required this.onBag,
    this.favoritesOnly = false,
  });
  final Shop shop;
  final VoidCallback onBag;
  final bool favoritesOnly;

  @override
  State<BoutiqueScreen> createState() => _BoutiqueScreenState();
}

class _BoutiqueScreenState extends State<BoutiqueScreen> {
  final _scroll = ScrollController();
  final _collection = GlobalKey();
  String? _model;

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _seeCollection() {
    final section = _collection.currentContext;
    if (section != null) {
      Scrollable.ensureVisible(
        section,
        duration: MediaQuery.disableAnimationsOf(context)
            ? Duration.zero
            : const Duration(milliseconds: 340),
        curve: Curves.easeOut,
      );
    }
  }

  List<_Variant> _variants(List<Product> models) {
    final result = <_Variant>[];
    // Present both silhouettes together before showing the next leather.
    final count = models.fold<int>(
      0,
      (n, model) => math.max(n, model.colors.length),
    );
    for (var i = 0; i < count; i++) {
      for (final product in models) {
        if (i >= product.colors.length) continue;
        final color = product.colors[i];
        if (widget.favoritesOnly &&
            !widget.shop.isFavorite(product.id, color)) {
          continue;
        }
        result.add((product: product, color: color));
      }
    }
    return result;
  }

  @override
  Widget build(BuildContext context) {
    final shop = widget.shop;
    final favorites = widget.favoritesOnly;
    return SafeArea(
      bottom: false,
      child: AnimatedBuilder(
        animation: shop,
        builder: (context, _) {
          final models = shop.products;
          final variants = _variants(
            models
                .where((p) => favorites || _model == null || p.id == _model)
                .toList(),
          );
          return LayoutBuilder(
            builder: (context, limits) {
              final width = limits.maxWidth;
              final columns =
                  MediaQuery.textScalerOf(context).scale(16) > 24 || width < 315
                  ? 1
                  : width >= 950
                  ? 4
                  : width >= 620
                  ? 3
                  : 2;
              final pad = math.max(16.0, (width - 1080) / 2);
              final rows = (variants.length / columns).ceil();
              final inset = EdgeInsets.symmetric(horizontal: pad);
              return RefreshIndicator(
                onRefresh: shop.refresh,
                child: CustomScrollView(
                  controller: _scroll,
                  physics: const AlwaysScrollableScrollPhysics(),
                  slivers: [
                    if (!favorites)
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: inset,
                          child: Row(
                            children: [
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 13,
                                ),
                                child: Image.asset(
                                  'assets/brand.png',
                                  width: 98,
                                  height: 37,
                                  fit: BoxFit.contain,
                                  alignment: Alignment.centerLeft,
                                  semanticLabel: 'Benka Shoes',
                                ),
                              ),
                              const Spacer(),
                              IconButton(
                                onPressed: widget.onBag,
                                tooltip: 'Ouvrir le panier',
                                icon: const Icon(Icons.shopping_bag_outlined),
                              ),
                            ],
                          ),
                        ),
                      ),
                    if (!favorites)
                      SliverToBoxAdapter(
                        child: _HeroPhoto(onCollection: _seeCollection),
                      ),
                    if (!favorites && shop.packPrices.length == 3)
                      SliverToBoxAdapter(
                        child: Material(
                          color: _wine,
                          child: InkWell(
                            onTap: () => showModalBottomSheet<void>(
                              context: context,
                              backgroundColor: _wine,
                              showDragHandle: true,
                              isScrollControlled: true,
                              useSafeArea: true,
                              builder: (_) => SafeArea(
                                child: SingleChildScrollView(
                                  child: _Packs(shop: shop),
                                ),
                              ),
                            ),
                            child: Padding(
                              padding: EdgeInsets.symmetric(
                                horizontal: pad,
                                vertical: 12,
                              ),
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.local_offer_outlined,
                                    color: Colors.white,
                                    size: 17,
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      'Trios Black Friday · dès ${shop.packPrices.values.reduce(math.min)} DH',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                  const Icon(
                                    Icons.arrow_forward,
                                    size: 18,
                                    color: Colors.white,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    SliverToBoxAdapter(
                      child: Padding(
                        key: _collection,
                        padding: EdgeInsets.fromLTRB(
                          pad,
                          favorites ? 32 : 24,
                          pad,
                          12,
                        ),
                        child: Text(
                          favorites ? 'Mes favoris' : 'La collection',
                          style: _title(context, 32),
                        ),
                      ),
                    ),
                    if (!favorites && models.length > 1)
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: inset,
                          child: Wrap(
                            spacing: 8,
                            runSpacing: 4,
                            children: [
                              for (final id in [
                                null,
                                ...models.map((p) => p.id),
                              ])
                                ChoiceChip(
                                  label: Text(
                                    id == null
                                        ? 'Tout'
                                        : models
                                              .firstWhere((p) => p.id == id)
                                              .name,
                                  ),
                                  selected: _model == id,
                                  showCheckmark: false,
                                  onSelected: (_) =>
                                      setState(() => _model = id),
                                  selectedColor: _ink,
                                  backgroundColor: _paper,
                                  side: BorderSide(
                                    color: _model == id ? _ink : _line,
                                  ),
                                  labelStyle: TextStyle(
                                    color: _model == id ? Colors.white : _ink,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    if (!shop.ready && !shop.loading)
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: inset,
                          child: _StockRetry(shop: shop),
                        ),
                      ),
                    if (shop.loading && !shop.ready)
                      const SliverToBoxAdapter(
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 10),
                          child: LinearProgressIndicator(minHeight: 2),
                        ),
                      ),
                    if (variants.isEmpty && (!shop.loading || favorites))
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: EdgeInsets.symmetric(
                            horizontal: pad,
                            vertical: 44,
                          ),
                          child: Column(
                            children: [
                              Icon(
                                favorites
                                    ? Icons.favorite_border
                                    : Icons.inventory_2_outlined,
                                size: 38,
                                color: _muted,
                              ),
                              const SizedBox(height: 14),
                              Text(
                                favorites
                                    ? 'Vos coups de cœur se retrouvent ici.'
                                    : 'La collection est indisponible.',
                                textAlign: TextAlign.center,
                                style: _title(context, 22),
                              ),
                              if (favorites)
                                const Padding(
                                  padding: EdgeInsets.only(top: 8),
                                  child: Text(
                                    'Touchez le cœur d’un coloris pour le retrouver ici.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(color: _muted),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    SliverPadding(
                      padding: EdgeInsets.fromLTRB(pad, 14, pad, 0),
                      sliver: SliverList.builder(
                        itemCount: rows,
                        itemBuilder: (context, row) => Padding(
                          padding: const EdgeInsets.only(bottom: 20),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              for (var col = 0; col < columns; col++) ...[
                                if (col > 0) const SizedBox(width: 12),
                                Expanded(
                                  child: row * columns + col < variants.length
                                      ? _ProductCard(
                                          variant:
                                              variants[row * columns + col],
                                          shop: shop,
                                          onBag: widget.onBag,
                                        )
                                      : const SizedBox(),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SliverToBoxAdapter(child: SizedBox(height: 16)),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _HeroPhoto extends StatelessWidget {
  const _HeroPhoto({required this.onCollection});
  final VoidCallback onCollection;
  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    return ColoredBox(
      color: _ink,
      child: Stack(
        children: [
          Positioned.fill(
            child: ExcludeSemantics(
              child: Image.asset(
                'assets/hero.jpg',
                fit: BoxFit.cover,
                alignment: Alignment.center,
              ),
            ),
          ),
          const Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0x09000000),
                    Color(0x401b1111),
                    Color(0xed241810),
                  ],
                  stops: [0, .45, 1],
                ),
              ),
            ),
          ),
          ConstrainedBox(
            constraints: BoxConstraints(minHeight: width < 620 ? 292 : 355),
            child: Align(
              alignment: Alignment.bottomLeft,
              child: Padding(
                padding: EdgeInsets.fromLTRB(
                  math.max(22.0, (width - 1060) / 2),
                  70,
                  20,
                  20,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'L’allure prend\nforme à Fès.',
                      style: _title(
                        context,
                        width < 620 ? 39 : 49,
                      ).copyWith(color: Colors.white, height: 1.02),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: onCollection,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Color(0xb3ffffff)),
                        backgroundColor: const Color(0x33000000),
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                      ),
                      iconAlignment: IconAlignment.end,
                      icon: const Icon(Icons.south, size: 17),
                      label: const Text('Découvrir les modèles'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Packs extends StatelessWidget {
  const _Packs({required this.shop});
  final Shop shop;
  @override
  Widget build(BuildContext context) {
    final prices = shop.packPrices;
    if (!['opus', 'mixte', 'as'].every(prices.containsKey)) {
      return const SizedBox();
    }
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: const BoxDecoration(color: _wine),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Les trios Black Friday',
            style: _title(context, 25).copyWith(color: Colors.white),
          ),
          const SizedBox(height: 8),
          const Text(
            'Pour un panier de trois paires, le prix du pack s’applique automatiquement.',
            style: TextStyle(color: Colors.white, height: 1.35),
          ),
          const SizedBox(height: 12),
          for (final pair in [
            ('3 Opus', 'opus'),
            ('Opus et AS mélangés', 'mixte'),
            ('3 AS by BENKA', 'as'),
          ])
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 5),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      pair.$1,
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${prices[pair.$2]} DH',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _StockRetry extends StatelessWidget {
  const _StockRetry({required this.shop});
  final Shop shop;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 6,
      children: [
        const Text(
          'Le stock est momentanément indisponible.',
          style: TextStyle(color: _muted),
        ),
        TextButton(
          onPressed: shop.loading ? null : shop.refresh,
          child: const Text('Réessayer'),
        ),
      ],
    ),
  );
}

class _Photo extends StatelessWidget {
  const _Photo(this.product, this.color, {this.detail = false});
  final Product product;
  final String color;
  final bool detail;
  @override
  Widget build(BuildContext context) {
    final bundled = Image.asset(
      'assets/products/${product.id}-$color.jpg',
      fit: BoxFit.cover,
      errorBuilder: (_, _, _) => const ColoredBox(
        color: Color(0xffeee8df),
        child: Center(
          child: Icon(Icons.image_not_supported_outlined, color: _muted),
        ),
      ),
    );
    if (!detail) return bundled;
    return Image.network(
      product.photo(color),
      fit: BoxFit.cover,
      excludeFromSemantics: true,
      frameBuilder: (context, child, frame, synced) =>
          frame == null && !synced ? bundled : child,
      errorBuilder: (_, _, _) => bundled,
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({
    required this.variant,
    required this.shop,
    required this.onBag,
  });
  final _Variant variant;
  final Shop shop;
  final VoidCallback onBag;
  @override
  Widget build(BuildContext context) {
    final p = variant.product, c = variant.color;
    final liked = shop.isFavorite(p.id, c);
    final soldOut =
        shop.ready && _sizes.every((s) => shop.stock(p.id, c, s) == 0);
    void open() => Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) =>
            _ProductPage(product: p, initialColor: c, shop: shop, onBag: onBag),
      ),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AspectRatio(
          aspectRatio: .94,
          child: Stack(
            fit: StackFit.expand,
            children: [
              Semantics(
                button: true,
                label: 'Voir ${p.name} ${colorName(c)}',
                child: InkWell(
                  onTap: open,
                  child: ExcludeSemantics(child: _Photo(p, c)),
                ),
              ),
              Positioned(
                top: 5,
                right: 5,
                child: IconButton.filledTonal(
                  style: IconButton.styleFrom(
                    backgroundColor: _paper,
                    foregroundColor: _wine,
                  ),
                  tooltip: liked
                      ? 'Retirer des favoris'
                      : 'Ajouter aux favoris',
                  isSelected: liked,
                  icon: const Icon(Icons.favorite_border, size: 19),
                  selectedIcon: const Icon(Icons.favorite, size: 19),
                  onPressed: () => shop.toggleFavorite(p.id, c),
                ),
              ),
            ],
          ),
        ),
        InkWell(
          onTap: open,
          child: Padding(
            padding: const EdgeInsets.only(top: 10, bottom: 2),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(p.name, style: _title(context, 20)),
                const SizedBox(height: 4),
                Text(
                  colorName(c),
                  style: const TextStyle(color: _muted, fontSize: 13),
                ),
                const SizedBox(height: 4),
                if (shop.ready)
                  Text(
                    '${p.price} DH',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                if (soldOut)
                  const Text(
                    'Épuisé',
                    style: TextStyle(color: _wine, fontSize: 12),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ProductPage extends StatefulWidget {
  const _ProductPage({
    required this.product,
    required this.initialColor,
    required this.shop,
    required this.onBag,
  });
  final Product product;
  final String initialColor;
  final Shop shop;
  final VoidCallback onBag;
  @override
  State<_ProductPage> createState() => _ProductPageState();
}

class _ProductPageState extends State<_ProductPage> {
  late String _color = widget.initialColor;
  int? _size;
  final _sizeSection = GlobalKey();
  String? _feedback;

  void _changeColor(String color) {
    if (_color == color) return;
    setState(() {
      _color = color;
      _size = null;
      _feedback = null;
    });
  }

  void _openBag() {
    Navigator.pop(context);
    widget.onBag();
  }

  int _roomFor(int size) {
    final shop = widget.shop, id = widget.product.id;
    return math.min(10, shop.stock(id, _color, size)) -
        shop.inCart(id, _color, size);
  }

  void _add() {
    final size = _size;
    if (size == null || _roomFor(size) <= 0) {
      setState(() => _feedback = 'Choisissez votre pointure.');
      final area = _sizeSection.currentContext;
      if (area != null) {
        Scrollable.ensureVisible(
          area,
          alignment: .25,
          duration: MediaQuery.disableAnimationsOf(context)
              ? Duration.zero
              : const Duration(milliseconds: 240),
        );
      }
      return;
    }
    final ok = widget.shop.add(widget.product.id, _color, size);
    if (!ok) {
      setState(
        () => _feedback =
            'Cette quantité est indisponible. Vérifiez la pointure ou le panier.',
      );
      return;
    }
    setState(() => _feedback = null);
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Text(
          '${widget.product.name} · ${colorName(_color)} · $size ajouté au panier',
        ),
        action: SnackBarAction(
          label: 'Voir le panier',
          onPressed: () {
            if (mounted) _openBag();
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: widget.shop,
    builder: (context, _) {
      final shop = widget.shop;
      final p = shop.products.firstWhere(
        (p) => p.id == widget.product.id,
        orElse: () => widget.product,
      );
      final liked = shop.isFavorite(p.id, _color);
      final canBuy = shop.ready && _sizes.any((s) => _roomFor(s) > 0);
      final chosen = _size != null && _roomFor(_size!) > 0;
      return Scaffold(
        backgroundColor: _paper,
        appBar: AppBar(
          backgroundColor: _paper,
          foregroundColor: _ink,
          title: Text(p.name),
          actions: [
            IconButton(
              onPressed: () => shop.toggleFavorite(p.id, _color),
              tooltip: liked ? 'Retirer des favoris' : 'Ajouter aux favoris',
              icon: Icon(
                liked ? Icons.favorite : Icons.favorite_border,
                color: _wine,
              ),
            ),
            IconButton(
              onPressed: _openBag,
              tooltip: 'Ouvrir le panier',
              icon: const Icon(Icons.shopping_bag_outlined),
            ),
          ],
        ),
        body: SafeArea(
          top: false,
          bottom: false,
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 700),
              child: ListView(
                children: [
                  Semantics(
                    image: true,
                    label: '${p.name}, ${colorName(_color)}',
                    child: AspectRatio(
                      aspectRatio: 1.16,
                      child: _Photo(p, _color, detail: true),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 22),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          crossAxisAlignment: WrapCrossAlignment.center,
                          runSpacing: 6,
                          spacing: 16,
                          children: [
                            Text(p.name, style: _title(context, 32)),
                            if (shop.ready)
                              Text(
                                '${p.price} DH',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 18,
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 5),
                        Text(p.subtitle, style: const TextStyle(color: _muted)),
                        const Divider(height: 32, color: _line),
                        Text(
                          'Coloris · ${colorName(_color)}',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        Wrap(
                          spacing: 2,
                          children: [
                            for (final color in p.colors)
                              Semantics(
                                button: true,
                                selected: color == _color,
                                label: colorName(color),
                                child: Tooltip(
                                  message: colorName(color),
                                  excludeFromSemantics: true,
                                  child: InkWell(
                                    onTap: () => _changeColor(color),
                                    customBorder: const CircleBorder(),
                                    child: SizedBox.square(
                                      dimension: 46,
                                      child: Center(
                                        child: Container(
                                          padding: const EdgeInsets.all(3),
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                            border: Border.all(
                                              color: color == _color
                                                  ? _ink
                                                  : Colors.transparent,
                                              width: 1.5,
                                            ),
                                          ),
                                          child: DecoratedBox(
                                            decoration: BoxDecoration(
                                              shape: BoxShape.circle,
                                              color: _swatches[color] ?? _muted,
                                            ),
                                            child: const SizedBox.square(
                                              dimension: 24,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          key: _sizeSection,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 12,
                          children: [
                            const Text(
                              'Pointure EU',
                              style: TextStyle(fontWeight: FontWeight.w700),
                            ),
                            TextButton(
                              onPressed: () => showModalBottomSheet<void>(
                                context: context,
                                showDragHandle: true,
                                isScrollControlled: true,
                                builder: (_) => const _SizeGuide(),
                              ),
                              child: const Text('Guide des pointures'),
                            ),
                          ],
                        ),
                        if (shop.ready)
                          Wrap(
                            spacing: 8,
                            runSpacing: 5,
                            children: [
                              for (final size in _sizes)
                                ChoiceChip(
                                  label: Text('$size'),
                                  showCheckmark: false,
                                  selected: _size == size && _roomFor(size) > 0,
                                  tooltip: _roomFor(size) > 0
                                      ? 'Pointure $size'
                                      : 'Pointure $size indisponible',
                                  onSelected: _roomFor(size) <= 0
                                      ? null
                                      : (_) => setState(() {
                                          _size = size;
                                          _feedback = null;
                                        }),
                                ),
                            ],
                          )
                        else if (shop.loading)
                          const LinearProgressIndicator()
                        else
                          _StockRetry(shop: shop),
                        if (_feedback != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Semantics(
                              liveRegion: true,
                              child: Text(
                                _feedback!,
                                style: const TextStyle(color: _wine),
                              ),
                            ),
                          ),
                        const Divider(height: 32, color: _line),
                        Text(
                          p.description,
                          style: const TextStyle(height: 1.5, color: _ink),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        bottomNavigationBar: SafeArea(
          top: false,
          minimum: const EdgeInsets.fromLTRB(16, 8, 16, 10),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 50),
            child: FilledButton(
              onPressed: shop.pendingOrder || shop.submitting
                  ? _openBag
                  : canBuy
                  ? _add
                  : null,
              child: Text(
                shop.pendingOrder || shop.submitting
                    ? 'Retrouver ma commande'
                    : !shop.ready
                    ? 'Stock à vérifier'
                    : !canBuy
                    ? 'Quantité indisponible'
                    : chosen
                    ? 'Ajouter au panier'
                    : 'Choisir une pointure',
              ),
            ),
          ),
        ),
      );
    },
  );
}

class _SizeGuide extends StatelessWidget {
  const _SizeGuide();
  @override
  Widget build(BuildContext context) => SafeArea(
    child: SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 4, 24, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Guide des pointures', style: _title(context, 28)),
          const SizedBox(height: 10),
          const Text(
            'Posez le talon contre un mur et mesurez jusqu’à l’orteil le plus long.',
          ),
          const SizedBox(height: 12),
          for (final entry in [
            (37, '23,8'),
            (38, '24,5'),
            (39, '25,1'),
            (40, '25,8'),
            (41, '26,4'),
          ])
            ListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              title: Text('Pointure ${entry.$1}'),
              trailing: Text('${entry.$2} cm'),
            ),
        ],
      ),
    ),
  );
}
