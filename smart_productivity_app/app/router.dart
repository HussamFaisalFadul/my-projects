import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/home/view/home_page.dart';
import '../features/lists/view/lists_page.dart';
import '../features/lists/view/list_detail_page.dart';
import '../features/sharing/view/join_list_page.dart';
import '../features/habits/view/habits_page.dart';
import '../features/goals/view/goals_page.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    routes: [
      ShellRoute(
        builder: (context, state, child) => HomeShell(child: child),
        routes: [
          GoRoute(path: '/',       builder: (c, s) => const ListsPage()),
          GoRoute(path: '/habits', builder: (c, s) => const HabitsPage()),
          GoRoute(path: '/goals',  builder: (c, s) => const GoalsPage()),
        ],
      ),
      GoRoute(
        path: '/list/:listId',
        builder: (c, s) => ListDetailPage(listId: s.pathParameters['listId']!),
      ),
      GoRoute(
        path: '/join',
        builder: (c, s) => const JoinListPage(),
      ),
    ],
  );
});
