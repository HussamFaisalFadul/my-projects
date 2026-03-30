import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class HomeShell extends StatelessWidget {
  final Widget child;
  const HomeShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    final index = switch (location) {
      '/habits' => 1,
      '/goals'  => 2,
      _         => 0,
    };
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) {
          switch (i) {
            case 0: context.go('/');
            case 1: context.go('/habits');
            case 2: context.go('/goals');
          }
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.checklist_rounded), label: 'القوائم'),
          NavigationDestination(icon: Icon(Icons.loop_rounded),      label: 'العادات'),
          NavigationDestination(icon: Icon(Icons.flag_rounded),      label: 'الأهداف'),
        ],
      ),
    );
  }
}
