import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CartItem } from '../types/index';

interface SaleItemsModalProps {
  visible: boolean;
  items: CartItem[];
  total: number;
  onClose: () => void;
  onAddItems: () => void;
  onIncrementItem: (item: CartItem) => void;
  onDecrementItem: (item: CartItem) => void;
  onRemoveItem: (item: CartItem) => void;
}

const SaleItemsModal: React.FC<SaleItemsModalProps> = ({ visible, items, total, onClose, onAddItems, onIncrementItem, onDecrementItem, onRemoveItem }) => {
  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.itemRow}>
      <View style={styles.itemLeft}>
        <Text style={styles.itemName} numberOfLines={1} ellipsizeMode="tail">{item.nomeProduto}</Text>
        <Text style={styles.itemPrice}>R$ {item.precoUnitario?.toFixed(2)}</Text>
      </View>
      <View style={styles.itemRight}>
        <View style={styles.itemActions}>
          <TouchableOpacity style={styles.iconButton} onPress={() => onDecrementItem(item)}>
            <Ionicons name="remove" size={20} color="#333" />
          </TouchableOpacity>
          <Text style={styles.itemQuantity}>{item.quantidade}</Text>
          <TouchableOpacity style={styles.iconButton} onPress={() => onIncrementItem(item)}>
            <Ionicons name="add" size={20} color="#333" />
          </TouchableOpacity>
        </View>
        <Text style={styles.itemSubtotal}>R$ {item.subtotal?.toFixed(2)}</Text>
        <TouchableOpacity style={styles.trashButton} onPress={() => onRemoveItem(item)}>
          <Ionicons name="trash-outline" size={20} color="#b00020" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Itens da Venda</Text>
            <Text style={styles.headerCount}>({items.length} itens)</Text>
          </View>
          <Text style={styles.headerTotal}>R$ {total.toFixed(2)}</Text>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Nenhum item adicionado</Text>
            <Text style={styles.emptySubtext}>Use o botão abaixo para adicionar itens</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.footerButton, styles.addButton]} onPress={onAddItems}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.footerButtonText}>Adicionar itens</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.footerButton, styles.closeButton]} onPress={onClose}>
            <Ionicons name="close" size={18} color="#333" />
            <Text style={styles.footerButtonTextClose}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#f8f9fa',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  headerCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  headerTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemLeft: {
    flex: 1,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  itemPrice: {
    fontSize: 12,
    color: '#666',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  iconButton: {
    padding: 4,
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: 'bold',
    minWidth: 24,
    textAlign: 'center',
    color: '#333',
    marginHorizontal: 6,
  },
  itemSubtotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    minWidth: 70,
    textAlign: 'right',
  },
  trashButton: {
    padding: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#f8f9fa',
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButton: {
    backgroundColor: '#2196F3',
    marginRight: 8,
  },
  closeButton: {
    backgroundColor: '#eee',
    marginLeft: 8,
  },
  footerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  footerButtonTextClose: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default SaleItemsModal;