import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:boutique/boutique.dart';
import 'package:boutique/shop.dart';

class OfflineDemoShop extends Shop {
  final fav = <String>{};
  bool added = false;
  @override
  bool get ready => true;
  @override
  bool get loading => false;
  @override
  int stock(String id, String color, int size) => size == 37 ? 0 : 5;
  @override
  int inCart(String id, String color, int size) => added ? 1 : 0;
  @override
  bool isFavorite(String id, String color) => fav.contains('$id/$color');
  @override
  void toggleFavorite(String id, String color) {
    final k = '$id/$color';
    if (!fav.remove(k)) fav.add(k);
    notifyListeners();
  }

  @override
  bool add(String id, String color, int size) {
    if (size != 39) return false;
    added = true;
    notifyListeners();
    return true;
  }

  @override
  Map<String, int> get packPrices => {'opus': 699, 'mixte': 749, 'as': 799};
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('Prix des packs, ajout de la pointure, retour panier, favoris', (
    t,
  ) async {
    t.view.devicePixelRatio = 1.0;
    t.view.physicalSize = const Size(375, 812);
    addTearDown(t.view.reset);
    final shop = OfflineDemoShop();
    addTearDown(shop.dispose);
    bool bag = false;
    await t.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BoutiqueScreen(
            shop: shop,
            onBag: () {
              bag = true;
            },
          ),
        ),
      ),
    );
    await t.pumpAndSettle();
    await t.tap(find.textContaining('Trios Black Friday'));
    await t.pumpAndSettle();
    expect(find.text('749 DH'), findsOneWidget);
    Navigator.pop(t.element(find.text('749 DH')));
    await t.pumpAndSettle();
    await t.tap(find.text('Découvrir les modèles'));
    await t.pumpAndSettle();
    await t.tap(find.byTooltip('Ajouter aux favoris').first);
    await t.pumpAndSettle();
    expect(shop.fav.length, 1);
    await t.tap(find.bySemanticsLabel('Voir Opus Beige').first);
    await t.pumpAndSettle();
    expect(find.text('Mocassin-mule à bride penny'), findsOneWidget);
    await t.tap(find.text('Choisir une pointure'));
    await t.pumpAndSettle();
    expect(
      t
          .widget<ChoiceChip>(
            find.ancestor(
              of: find.text('37'),
              matching: find.byType(ChoiceChip),
            ),
          )
          .onSelected,
      isNull,
    );
    await t.tap(find.text('39'));
    await t.pumpAndSettle();
    await t.tap(find.text('Ajouter au panier'));
    await t.pumpAndSettle();
    expect(shop.added, isTrue);
    await t.tap(find.text('Voir le panier'));
    await t.pumpAndSettle();
    expect(bag, isTrue);
    expect(t.takeException(), isNull);
  });
  testWidgets('Grand texte sur petit écran', (t) async {
    t.view.physicalSize = const Size(320, 680);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    final shop = OfflineDemoShop();
    addTearDown(shop.dispose);
    await t.pumpWidget(
      MaterialApp(
        home: MediaQuery(
          data: const MediaQueryData(
            size: Size(320, 680),
            textScaler: TextScaler.linear(2),
          ),
          child: Scaffold(
            body: BoutiqueScreen(shop: shop, onBag: () {}),
          ),
        ),
      ),
    );
    await t.pumpAndSettle();
    await t.ensureVisible(find.text('Découvrir les modèles'));
    await t.pumpAndSettle();
    await t.tap(find.text('Découvrir les modèles'));
    await t.pumpAndSettle();
    expect(t.takeException(), isNull);
  });
}
