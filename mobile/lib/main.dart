import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'atelier.dart';
import 'bag.dart';
import 'boutique.dart';
import 'shop.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const BenkaApp());
}

class BenkaApp extends StatefulWidget {
  const BenkaApp({super.key, this.shop});
  final Shop? shop;

  @override
  State<BenkaApp> createState() => _BenkaAppState();
}

class _BenkaAppState extends State<BenkaApp> with WidgetsBindingObserver {
  late final Shop shop;
  int index = 0;
  static const paper = Color(0xfffaf7f2);
  static const ink = Color(0xff241a17);
  static const bordeaux = Color(0xff782b38);

  @override
  void initState() {
    super.initState();
    shop = widget.shop ?? Shop();
    WidgetsBinding.instance.addObserver(this);
    shop.initialize();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && !shop.submitting) shop.refresh();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    if (widget.shop == null) shop.dispose();
    super.dispose();
  }

  void select(int value) => setState(() => index = value);

  @override
  Widget build(BuildContext context) {
    final palette = ColorScheme.fromSeed(seedColor: bordeaux).copyWith(
      primary: bordeaux,
      onPrimary: Colors.white,
      surface: paper,
      onSurface: ink,
    );
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: palette,
      fontFamily: 'Archivo',
    );
    final theme = base.copyWith(
      scaffoldBackgroundColor: paper,
      textTheme: base.textTheme.copyWith(
        displaySmall: base.textTheme.displaySmall?.copyWith(
          fontFamily: 'Newsreader',
          height: 1.08,
        ),
        headlineMedium: base.textTheme.headlineMedium?.copyWith(
          fontFamily: 'Newsreader',
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: paper,
        foregroundColor: ink,
        surfaceTintColor: Colors.transparent,
      ),
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(),
        filled: true,
        fillColor: Colors.white,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(44, 50),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
      navigationBarTheme: const NavigationBarThemeData(
        backgroundColor: paper,
        elevation: 0,
        indicatorColor: Color(0xffeedfda),
        labelTextStyle: WidgetStatePropertyAll(
          TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
        ),
      ),
    );
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Benka Shoes',
      theme: theme,
      locale: const Locale('fr'),
      supportedLocales: const [Locale('fr')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      home: AnimatedBuilder(
        animation: shop,
        builder: (context, _) {
          final count = shop.cart.fold(0, (s, l) => s + l.quantity);
          return Scaffold(
            body: IndexedStack(
              index: index,
              children: [
                BoutiqueScreen(shop: shop, onBag: () => select(2)),
                BoutiqueScreen(
                  shop: shop,
                  onBag: () => select(2),
                  favoritesOnly: true,
                ),
                BagScreen(shop: shop, onShop: () => select(0)),
                const AtelierScreen(),
              ],
            ),
            bottomNavigationBar: DecoratedBox(
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: Color(0xffdfd6ce))),
              ),
              child: NavigationBar(
                height: 66,
                selectedIndex: index,
                onDestinationSelected: select,
                destinations: [
                  const NavigationDestination(
                    icon: Icon(Icons.storefront_outlined),
                    selectedIcon: Icon(Icons.storefront),
                    label: 'Boutique',
                  ),
                  const NavigationDestination(
                    icon: Icon(Icons.favorite_border),
                    selectedIcon: Icon(Icons.favorite),
                    label: 'Favoris',
                  ),
                  NavigationDestination(
                    icon: Badge.count(
                      count: count,
                      isLabelVisible: count > 0,
                      child: const Icon(Icons.shopping_bag_outlined),
                    ),
                    label: 'Panier',
                  ),
                  const NavigationDestination(
                    icon: Icon(Icons.grid_view_outlined),
                    selectedIcon: Icon(Icons.grid_view_rounded),
                    label: 'Atelier',
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
