import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

const supportEmail = 'benkashoes@gmail.com';

class AtelierScreen extends StatelessWidget {
  const AtelierScreen({super.key});

  Future<void> open(BuildContext context, Uri uri) async {
    try {
      if (await launchUrl(uri, mode: LaunchMode.externalApplication)) return;
    } on PlatformException {
      // Phones can be configured without a browser or mail application.
    }
    if (!context.mounted) return;
    if (uri.scheme == 'mailto') {
      await Clipboard.setData(const ClipboardData(text: supportEmail));
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Adresse e-mail de l’atelier copiée.')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Ouverture impossible. Réessayez depuis votre navigateur.',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      bottom: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 36),
        children: [
          Text('L’atelier', style: theme.textTheme.displaySmall),
          const SizedBox(height: 18),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: Image.asset(
              'assets/atelier.jpg',
              height: 230,
              width: double.infinity,
              fit: BoxFit.cover,
              semanticLabel: 'À l’atelier Benka',
            ),
          ),
          const SizedBox(height: 20),
          Text('Du daim à la paire', style: theme.textTheme.headlineMedium),
          const SizedBox(height: 8),
          const Text(
            'À Fès, la maison Benka travaille le daim, coupe les pièces et monte chaque mule sur forme. La bride penny signe Opus. La boucle et les clous argentés dessinent AS by BENKA.',
            style: TextStyle(height: 1.5),
          ),
          const SizedBox(height: 18),
          OutlinedButton.icon(
            onPressed: () =>
                open(context, Uri.https('www.benkashoes.ma', '/showroom/')),
            icon: const Icon(Icons.open_in_new),
            label: const Text('Visiter le showroom'),
          ),
          const SizedBox(height: 22),
          const Divider(),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Une question sur votre commande ?'),
            subtitle: const Text(supportEmail),
            trailing: const Icon(Icons.mail_outline),
            onTap: () =>
                open(context, Uri(scheme: 'mailto', path: supportEmail)),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Livraison et aide'),
            trailing: const Icon(Icons.arrow_outward),
            onTap: () =>
                open(context, Uri.https('www.benkashoes.ma', '/aide/')),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Confidentialité de l’application'),
            trailing: const Icon(Icons.arrow_outward),
            onTap: () => open(
              context,
              Uri.https('www.benkashoes.ma', '/application/confidentialite/'),
            ),
          ),
        ],
      ),
    );
  }
}
