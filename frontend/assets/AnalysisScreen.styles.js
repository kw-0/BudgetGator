import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  accountSelectorButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196F3",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  accountSelectorButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  accountSelectorArrow: {
    color: "white",
    fontSize: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 20,
  },
  selectorContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  selectorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  accountList: {
    maxHeight: 400,
  },
  accountOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
  },
  accountOptionSelected: {
    backgroundColor: "#E3F2FD",
    borderWidth: 2,
    borderColor: "#2196F3",
  },
  accountOptionText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  accountOptionTextSelected: {
    fontWeight: "600",
    color: "#2196F3",
  },
  checkmark: {
    fontSize: 18,
    color: "#2196F3",
    fontWeight: "bold",
  },
  closeModalButton: {
    marginTop: 16,
    backgroundColor: "#666",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  closeModalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  monthNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 8,
  },
  navButton: {
    fontSize: 14,
    color: "#2196F3",
    paddingHorizontal: 12,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  pieChartContainer: {
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 32,
    backgroundColor: "white",
    borderRadius: 12,
    overflow: 'visible',
  },
  pieSlicesContainer: {
    width: '100%',
    justifyContent: "center",
    alignItems: "center",
  },
  totalContainer: {
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderRadius: 12,
  },
  totalLabel: {
    fontSize: 14,
    color: "#666",
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginTop: 4,
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 8,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  breakdownArrow: {
    fontSize: 16,
    color: "#2196F3",
  },
  breakdownContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  categoryDetails: {
    flex: 1,
    marginLeft: 16,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    marginBottom: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  categoryPercentage: {
    fontSize: 12,
    color: "#999",
  },
  loader: {
    marginVertical: 24,
  },
  noData: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginVertical: 24,
  },
  categoryRowSelected: {
    backgroundColor: '#e8f4ff',
  },
  categoryNameSelected: {
    fontWeight: '700',
  },
  txListContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  txListHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  txName: {
    fontSize: 14,
    color: '#333',
  },
  txDate: {
    fontSize: 12,
    color: '#999',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default styles;