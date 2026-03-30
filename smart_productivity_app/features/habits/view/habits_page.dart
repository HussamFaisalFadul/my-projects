import 'package:flutter/material.dart';

class HabitsPage extends StatelessWidget {
  const HabitsPage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('العادات')),
    body: const Center(child: Text('قريباً — تتبع عاداتك اليومية')),
  );
}
