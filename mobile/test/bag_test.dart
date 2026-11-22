import 'dart:convert';
import 'package:boutique/bag.dart';
import 'package:boutique/shop.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'shop_test.dart' show jsonReply, liveData;

void main() {
  for (final lostResponse in [false, true]) {
    testWidgets(
      lostResponse
          ? 'Une réponse perdue retrouve la référence sans créer un second panier'
          : 'Le trio AS à 799 DH exige les coordonnées puis affiche la référence',
      (tester) async {
        tester.view.physicalSize = const Size(375, 740);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        SharedPreferences.setMockInitialValues({});
        var posts = 0;
        final client = MockClient((request) async {
          if (request.method == 'GET') return jsonReply(liveData());
          posts++;
          final order = jsonDecode(request.body);
          if (posts == 1) {
            expect(order['expectedTotal'], 799);
            expect(order['customer']['email'], 'test@example.com');
            if (lostResponse) {
              throw http.ClientException('Réponse perdue simulée');
            }
          } else {
            expect(order['items'], isEmpty);
          }
          return jsonReply({'ok': true, 'ref': 'BS-2026-12345'});
        });
        final shop = Shop(
          client: client,
          prefs: await SharedPreferences.getInstance(),
        );
        await shop.initialize();
        shop.setQuantity('as', 'noir', 39, 3);
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: BagScreen(shop: shop, onShop: () {}),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('799 DH'), findsOneWidget);
        final next = find.text('Passer à la livraison');
        await tester.ensureVisible(next);
        await tester.tap(next);
        await tester.pumpAndSettle();
        final submit = find.text('Confirmer la commande · 799 DH');
        await tester.ensureVisible(submit);
        await tester.tap(submit);
        await tester.pumpAndSettle();
        expect(posts, 0);
        expect(find.text('Renseignez ce champ.'), findsWidgets);
        for (final pair in {
          'Nom et prénom': 'Essai Client',
          'Téléphone': '0612345678',
          'Adresse e-mail': 'test@example.com',
          'Adresse de livraison': '23 rue test',
          'Ville': 'Fès',
        }.entries) {
          final field = find.widgetWithText(TextFormField, pair.key);
          await tester.ensureVisible(field);
          await tester.enterText(field, pair.value);
        }
        await tester.testTextInput.receiveAction(TextInputAction.done);
        await tester.ensureVisible(submit);
        await tester.tap(submit);
        await tester.pumpAndSettle();
        if (lostResponse) {
          expect(find.text('Suivi de commande'), findsOneWidget);
          final retry = find.text('Vérifier ma commande');
          expect(find.text('Reprendre avec mes coordonnées'), findsNothing);
          expect(find.text('Contacter l’atelier'), findsOneWidget);
          await tester.tap(retry);
          await tester.pumpAndSettle();
        }
        expect(find.text('Commande reçue'), findsOneWidget);
        expect(find.text('BS-2026-12345'), findsOneWidget);
        expect(posts, lostResponse ? 2 : 1);
        expect(shop.cart, isEmpty);
      },
    );
  }
}
