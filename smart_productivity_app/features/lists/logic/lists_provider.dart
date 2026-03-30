import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/lists_service.dart';
import '../model/list_model.dart';

final listsServiceProvider = Provider((ref) => ListsService());

final listsStreamProvider = StreamProvider<List<ListModel>>((ref) {
  return ref.watch(listsServiceProvider).getUserLists();
});
