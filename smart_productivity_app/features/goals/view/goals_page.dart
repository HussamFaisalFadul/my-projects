import 'package:flutter/material.dart';

class GoalsPage extends StatelessWidget {
  const GoalsPage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('الأهداف')),
    body: const Center(child: Text('قريباً — تتبع أهدافك الكبيرة')),
  );
}
