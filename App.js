import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    Alert,
    StyleSheet,
    StatusBar,
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DB from './src/database/database';

export default function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showAddTransaction, setShowAddTransaction] = useState(false);
    const [showAddAccount, setShowAddAccount] = useState(false);

    // Estados de Dados
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [incomeConfig, setIncomeConfig] = useState({
        dailyRate: 100,
        daysPerWeek: 5,
        manualOverride: false,
        manualAmount: 3000
    });

    // Inputs Temporários
    const [newTransaction, setNewTransaction] = useState({
        description: '',
        amount: '',
        type: 'expense',
        category: 'Alimentação',
        accountId: ''
    });

    const [newAccount, setNewAccount] = useState({
        name: '',
        initialBalance: ''
    });

    // --- Inicializar Banco de Dados ---
    useEffect(() => {
        const initialize = async () => {
            await DB.initDatabase();
            await loadData();
        };
        initialize();
    }, []);

    const loadData = async () => {
        const loadedAccounts = await DB.getAccounts();
        const loadedTransactions = await DB.getTransactions();
        const loadedConfig = await DB.getConfig();

        setAccounts(loadedAccounts);
        setTransactions(loadedTransactions);
        setIncomeConfig({
            dailyRate: loadedConfig.daily_rate,
            daysPerWeek: loadedConfig.days_per_week,
            manualOverride: loadedConfig.manual_override === 1,
            manualAmount: loadedConfig.manual_amount
        });
    };

    // --- Lógica de Negócio ---

    const estimatedMonthlyIncome = incomeConfig.manualOverride
        ? Number(incomeConfig.manualAmount)
        : Number(incomeConfig.dailyRate) * Number(incomeConfig.daysPerWeek) * 4.33;

    const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);

    // Estados para gastos (precisam ser estados pois são assíncronos)
    const [expensesMonth, setExpensesMonth] = useState(0);
    const [expensesToday, setExpensesToday] = useState(0);
    const [categoryData, setCategoryData] = useState({});

    useEffect(() => {
        const loadExpenses = async () => {
            const month = await DB.getExpensesByPeriod('month');
            const today = await DB.getExpensesByPeriod('today');
            const categories = await DB.getExpensesByCategory();

            setExpensesMonth(month);
            setExpensesToday(today);
            setCategoryData(categories);
        };

        loadExpenses();
        const interval = setInterval(loadExpenses, 5000); // Atualizar a cada 5 segundos
        return () => clearInterval(interval);
    }, [transactions]);

    const remainingBudget = estimatedMonthlyIncome - expensesMonth;
    const budgetPercentage = Math.min(100, Math.max(0, (expensesMonth / estimatedMonthlyIncome) * 100));

    // --- Funções de Ação ---

    const handleAddTransaction = async () => {
        if (!newTransaction.description || !newTransaction.amount || !newTransaction.accountId) {
            Alert.alert("Erro", "Preencha todos os campos!");
            return;
        }

        const amount = Number(newTransaction.amount.replace(',', '.'));
        const selectedAccount = accounts.find(a => a.id === Number(newTransaction.accountId));

        const transactionId = await DB.addTransaction(
            newTransaction.description,
            amount,
            newTransaction.type,
            newTransaction.category,
            Number(newTransaction.accountId),
            selectedAccount.name
        );

        if (transactionId) {
            await loadData();
            setShowAddTransaction(false);
            setNewTransaction({
                description: '',
                amount: '',
                type: 'expense',
                category: 'Alimentação',
                accountId: ''
            });
        }
    };

    const handleAddAccount = async () => {
        if (!newAccount.name || !newAccount.initialBalance) {
            Alert.alert("Erro", "Preencha todos os campos!");
            return;
        }

        const accountId = await DB.addAccount(
            newAccount.name,
            Number(newAccount.initialBalance.replace(',', '.')),
            '#64748b'
        );

        if (accountId) {
            await loadData();
            setNewAccount({ name: '', initialBalance: '' });
            setShowAddAccount(false);
        }
    };

    const deleteAccountHandler = (id) => {
        Alert.alert(
            "Confirmar",
            "Tem a certeza? O saldo será removido do total.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        await DB.deleteAccount(id);
                        await loadData();
                    }
                }
            ]
        );
    };

    const saveConfig = async () => {
        await DB.updateConfig(
            incomeConfig.dailyRate,
            incomeConfig.daysPerWeek,
            incomeConfig.manualOverride,
            incomeConfig.manualAmount
        );
        Alert.alert("Sucesso", "Configurações guardadas!");
    };

    const formatCurrency = (val) => {
        return 'R$ ' + val.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();

        if (isToday) return 'Hoje';

        return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
    };

    // --- Renderização UI ---

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.headerSubtitle}>Saldo Total Acumulado</Text>
                        <Text style={styles.headerTitle}>{formatCurrency(totalBalance)}</Text>
                    </View>
                    <View style={styles.headerIcon}>
                        <Ionicons name="wallet" size={24} color="#FFF" />
                    </View>
                </View>

                {/* Resumo Horizontal */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryScroll}>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryCardHeader}>
                            <Ionicons name="calendar-outline" size={14} color="#C7D2FE" />
                            <Text style={styles.summaryCardLabel}>Hoje</Text>
                        </View>
                        <Text style={styles.summaryCardValue}>{formatCurrency(expensesToday)}</Text>
                    </View>

                    <View style={styles.summaryCard}>
                        <View style={styles.summaryCardHeader}>
                            <Ionicons name="trending-down" size={14} color="#C7D2FE" />
                            <Text style={styles.summaryCardLabel}>Mês</Text>
                        </View>
                        <Text style={styles.summaryCardValue}>{formatCurrency(expensesMonth)}</Text>
                    </View>

                    <View style={[styles.summaryCard, styles.summaryCardProfit]}>
                        <View style={styles.summaryCardHeader}>
                            <Ionicons name="trending-up" size={14} color="#D1FAE5" />
                            <Text style={[styles.summaryCardLabel, { color: '#D1FAE5' }]}>Lucro</Text>
                        </View>
                        <Text style={[styles.summaryCardValue, { color: '#F0FDF4' }]}>
                            {formatCurrency(remainingBudget)}
                        </Text>
                    </View>
                </ScrollView>
            </View>

            {/* Content Area */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                {/* DASHBOARD TAB */}
                {activeTab === 'dashboard' && (
                    <View style={styles.tabContent}>

                        {/* Barra de Progresso */}
                        <View style={styles.card}>
                            <View style={styles.progressHeader}>
                                <Text style={styles.cardTitle}>Fluxo Mensal</Text>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{Math.round(budgetPercentage)}% gasto</Text>
                                </View>
                            </View>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: `${budgetPercentage}%` }]} />
                            </View>
                            <View style={styles.progressLabels}>
                                <Text style={styles.progressLabel}>Gasto: {formatCurrency(expensesMonth)}</Text>
                                <Text style={styles.progressLabel}>Meta: {formatCurrency(estimatedMonthlyIncome)}</Text>
                            </View>
                        </View>

                        {/* Botões de Ação */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => {
                                    setNewTransaction({ ...newTransaction, type: 'expense' });
                                    setShowAddTransaction(true);
                                }}
                            >
                                <View style={[styles.actionButtonIcon, { backgroundColor: '#FEE2E2' }]}>
                                    <Ionicons name="trending-down" size={24} color="#DC2626" />
                                </View>
                                <Text style={styles.actionButtonText}>Nova Despesa</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => {
                                    setNewTransaction({ ...newTransaction, type: 'income' });
                                    setShowAddTransaction(true);
                                }}
                            >
                                <View style={[styles.actionButtonIcon, { backgroundColor: '#D1FAE5' }]}>
                                    <Ionicons name="trending-up" size={24} color="#059669" />
                                </View>
                                <Text style={styles.actionButtonText}>Nova Receita</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Categorias */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="pie-chart-outline" size={16} color="#6366F1" />
                                <Text style={styles.cardTitle}>Por Categoria</Text>
                            </View>
                            {Object.keys(categoryData).length === 0 ? (
                                <Text style={styles.emptyText}>Sem gastos registados.</Text>
                            ) : (
                                Object.entries(categoryData).map(([cat, amount], idx) => (
                                    <View key={cat} style={styles.categoryRow}>
                                        <View style={styles.categoryLeft}>
                                            <View style={[
                                                styles.categoryDot,
                                                { backgroundColor: ['#FB923C', '#60A5FA', '#EC4899', '#A78BFA'][idx % 4] }
                                            ]} />
                                            <Text style={styles.categoryName}>{cat}</Text>
                                        </View>
                                        <Text style={styles.categoryAmount}>{formatCurrency(amount)}</Text>
                                    </View>
                                ))
                            )}
                        </View>

                        {/* Últimas Transações */}
                        <Text style={styles.sectionTitle}>Últimas Transações</Text>
                        {transactions.slice(0, 10).map(t => (
                            <View key={t.id} style={styles.transactionCard}>
                                <View style={styles.transactionLeft}>
                                    <View style={[
                                        styles.transactionIcon,
                                        t.type === 'expense' ? styles.transactionIconExpense : styles.transactionIconIncome
                                    ]}>
                                        <Ionicons
                                            name={t.type === 'expense' ? 'trending-down' : 'trending-up'}
                                            size={18}
                                            color={t.type === 'expense' ? '#DC2626' : '#059669'}
                                        />
                                    </View>
                                    <View>
                                        <Text style={styles.transactionDescription}>{t.description}</Text>
                                        <Text style={styles.transactionMeta}>
                                            {t.category} • {t.account_name} • {formatDate(t.date)}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[
                                    styles.transactionAmount,
                                    t.type === 'expense' ? styles.transactionAmountExpense : styles.transactionAmountIncome
                                ]}>
                                    {t.type === 'expense' ? '-' : '+'} {formatCurrency(t.amount)}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* CARTEIRA TAB */}
                {activeTab === 'wallet' && (
                    <View style={styles.tabContent}>
                        <View style={styles.tabHeader}>
                            <Text style={styles.tabHeaderTitle}>Minhas Contas</Text>
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => setShowAddAccount(true)}
                            >
                                <Ionicons name="add" size={16} color="#4F46E5" />
                                <Text style={styles.addButtonText}>Adicionar</Text>
                            </TouchableOpacity>
                        </View>

                        {accounts.map(acc => (
                            <View key={acc.id} style={styles.accountCard}>
                                <View>
                                    <Text style={styles.accountName}>{acc.name}</Text>
                                    <Text style={styles.accountBalance}>{formatCurrency(acc.balance)}</Text>
                                </View>
                                <TouchableOpacity onPress={() => deleteAccountHandler(acc.id)}>
                                    <Ionicons name="trash-outline" size={20} color="#CBD5E1" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {/* CONFIGURAÇÕES TAB */}
                {activeTab === 'settings' && (
                    <View style={styles.tabContent}>
                        <Text style={styles.tabHeaderTitle}>Ajustes de Renda</Text>

                        <View style={styles.card}>
                            <Text style={styles.configSubtitle}>Defina como recebe para calcularmos o seu lucro.</Text>

                            <View style={styles.segmentControl}>
                                <TouchableOpacity
                                    style={[styles.segmentButton, !incomeConfig.manualOverride && styles.segmentButtonActive]}
                                    onPress={() => setIncomeConfig({ ...incomeConfig, manualOverride: false })}
                                >
                                    <Text style={[
                                        styles.segmentButtonText,
                                        !incomeConfig.manualOverride && styles.segmentButtonTextActive
                                    ]}>Por Dia</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.segmentButton, incomeConfig.manualOverride && styles.segmentButtonActive]}
                                    onPress={() => setIncomeConfig({ ...incomeConfig, manualOverride: true })}
                                >
                                    <Text style={[
                                        styles.segmentButtonText,
                                        incomeConfig.manualOverride && styles.segmentButtonTextActive
                                    ]}>Fixo Mensal</Text>
                                </TouchableOpacity>
                            </View>

                            {!incomeConfig.manualOverride ? (
                                <>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Valor por Dia (R$)</Text>
                                        <TextInput
                                            style={styles.input}
                                            keyboardType="numeric"
                                            value={String(incomeConfig.dailyRate)}
                                            onChangeText={(val) => setIncomeConfig({ ...incomeConfig, dailyRate: val })}
                                        />
                                    </View>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Dias por Semana</Text>
                                        <TextInput
                                            style={styles.input}
                                            keyboardType="numeric"
                                            maxLength={1}
                                            value={String(incomeConfig.daysPerWeek)}
                                            onChangeText={(val) => setIncomeConfig({ ...incomeConfig, daysPerWeek: val })}
                                        />
                                    </View>
                                </>
                            ) : (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Salário Mensal (R$)</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={String(incomeConfig.manualAmount)}
                                        onChangeText={(val) => setIncomeConfig({ ...incomeConfig, manualAmount: val })}
                                    />
                                </View>
                            )}

                            <View style={styles.configFooter}>
                                <Text style={styles.configFooterLabel}>Renda Estimada:</Text>
                                <Text style={styles.configFooterValue}>{formatCurrency(estimatedMonthlyIncome)}</Text>
                            </View>

                            <TouchableOpacity style={styles.saveButton} onPress={saveConfig}>
                                <Text style={styles.saveButtonText}>Guardar Configurações</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

            </ScrollView>

            {/* Bottom Tab Bar */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => setActiveTab('dashboard')}
                >
                    <Ionicons
                        name={activeTab === 'dashboard' ? 'home' : 'home-outline'}
                        size={24}
                        color={activeTab === 'dashboard' ? '#4F46E5' : '#CBD5E1'}
                    />
                    <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>
                        Início
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.tabCenter}
                    onPress={() => {
                        setNewTransaction({ ...newTransaction, type: 'expense' });
                        setShowAddTransaction(true);
                    }}
                >
                    <Ionicons name="add" size={28} color="#FFF" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => setActiveTab('wallet')}
                >
                    <Ionicons
                        name={activeTab === 'wallet' ? 'card' : 'card-outline'}
                        size={24}
                        color={activeTab === 'wallet' ? '#4F46E5' : '#CBD5E1'}
                    />
                    <Text style={[styles.tabText, activeTab === 'wallet' && styles.tabTextActive]}>
                        Contas
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => setActiveTab('settings')}
                >
                    <Ionicons
                        name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
                        size={24}
                        color={activeTab === 'settings' ? '#4F46E5' : '#CBD5E1'}
                    />
                    <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>
                        Ajustes
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Modal Nova Transação */}
            <Modal
                visible={showAddTransaction}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowAddTransaction(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {newTransaction.type === 'expense' ? 'Nova Despesa' : 'Nova Receita'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowAddTransaction(false)}>
                                <Ionicons name="close" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.amountInput}
                            placeholder="0,00"
                            keyboardType="decimal-pad"
                            value={newTransaction.amount}
                            onChangeText={(val) => setNewTransaction({ ...newTransaction, amount: val })}
                            autoFocus
                        />

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Descrição</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: Almoço"
                                value={newTransaction.description}
                                onChangeText={(val) => setNewTransaction({ ...newTransaction, description: val })}
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <View style={styles.inputHalf}>
                                <Text style={styles.inputLabel}>Categoria</Text>
                                <View style={styles.picker}>
                                    <TextInput
                                        style={styles.pickerText}
                                        value={newTransaction.category}
                                        onChangeText={(val) => setNewTransaction({ ...newTransaction, category: val })}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputHalf}>
                                <Text style={styles.inputLabel}>Conta</Text>
                                <View style={styles.picker}>
                                    <TextInput
                                        style={styles.pickerText}
                                        placeholder="ID da conta"
                                        keyboardType="numeric"
                                        value={newTransaction.accountId}
                                        onChangeText={(val) => setNewTransaction({ ...newTransaction, accountId: val })}
                                    />
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.confirmButton} onPress={handleAddTransaction}>
                            <Text style={styles.confirmButtonText}>Confirmar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal Nova Conta */}
            <Modal
                visible={showAddAccount}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowAddAccount(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: 350 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Adicionar Conta</Text>
                            <TouchableOpacity onPress={() => setShowAddAccount(false)}>
                                <Ionicons name="close" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Nome</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: Nubank"
                                value={newAccount.name}
                                onChangeText={(val) => setNewAccount({ ...newAccount, name: val })}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Saldo Inicial (R$)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0,00"
                                keyboardType="decimal-pad"
                                value={newAccount.initialBalance}
                                onChangeText={(val) => setNewAccount({ ...newAccount, initialBalance: val })}
                            />
                        </View>

                        <TouchableOpacity style={styles.confirmButton} onPress={handleAddAccount}>
                            <Text style={styles.confirmButtonText}>Salvar Conta</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        backgroundColor: '#4F46E5',
        paddingTop: 20,
        paddingBottom: 32,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerSubtitle: {
        color: '#C7D2FE',
        fontSize: 14,
        fontWeight: '500',
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: 'bold',
        marginTop: 4,
    },
    headerIcon: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 10,
        borderRadius: 999,
    },
    summaryScroll: {
        flexDirection: 'row',
    },
    summaryCard: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        padding: 12,
        borderRadius: 12,
        marginRight: 12,
        minWidth: 120,
    },
    summaryCardProfit: {
        backgroundColor: 'rgba(16,185,129,0.2)',
        borderColor: 'rgba(16,185,129,0.3)',
    },
    summaryCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    summaryCardLabel: {
        color: '#C7D2FE',
        fontSize: 12,
    },
    summaryCardValue: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    tabContent: {
        paddingBottom: 100,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#334155',
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    badge: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        color: '#4F46E5',
        fontSize: 12,
        fontWeight: 'bold',
    },
    progressBar: {
        height: 12,
        backgroundColor: '#F1F5F9',
        borderRadius: 999,
        overflow: 'hidden',
        marginBottom: 12,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#EF4444',
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    progressLabel: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    actionButton: {
        flex: 1,
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    actionButtonIcon: {
        padding: 10,
        borderRadius: 999,
        marginBottom: 8,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#475569',
    },
    emptyText: {
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 14,
        paddingVertical: 8,
    },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    categoryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoryDot: {
        width: 10,
        height: 10,
        borderRadius: 999,
    },
    categoryName: {
        color: '#475569',
        fontSize: 14,
    },
    categoryAmount: {
        fontWeight: 'bold',
        color: '#334155',
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#334155',
        marginBottom: 12,
    },
    transactionCard: {
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    transactionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    transactionIcon: {
        padding: 8,
        borderRadius: 8,
    },
    transactionIconExpense: {
        backgroundColor: '#FEE2E2',
    },
    transactionIconIncome: {
        backgroundColor: '#D1FAE5',
    },
    transactionDescription: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    transactionMeta: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    transactionAmount: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    transactionAmountExpense: {
        color: '#DC2626',
    },
    transactionAmountIncome: {
        color: '#059669',
    },
    tabHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    tabHeaderTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addButtonText: {
        color: '#4F46E5',
        fontSize: 14,
        fontWeight: 'bold',
    },
    accountCard: {
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    accountName: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
        marginBottom: 4,
    },
    accountBalance: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    configSubtitle: {
        fontSize: 12,
        color: '#94A3B8',
        marginBottom: 16,
    },
    segmentControl: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        padding: 4,
        borderRadius: 8,
        marginBottom: 16,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 6,
        alignItems: 'center',
    },
    segmentButtonActive: {
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    segmentButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#64748B',
    },
    segmentButtonTextActive: {
        color: '#4F46E5',
    },
    inputGroup: {
        marginBottom: 12,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#64748B',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: '#1E293B',
    },
    configFooter: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    configFooterLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#475569',
    },
    configFooterValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#059669',
    },
    saveButton: {
        backgroundColor: '#4F46E5',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    tabBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFF',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-start',
        paddingTop: 12,
        paddingBottom: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        height: 80,
    },
    tab: {
        alignItems: 'center',
        width: 64,
    },
    tabText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#CBD5E1',
        marginTop: 4,
    },
    tabTextActive: {
        color: '#4F46E5',
    },
    tabCenter: {
        backgroundColor: '#4F46E5',
        width: 56,
        height: 56,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -32,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    amountInput: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1E293B',
        textAlign: 'center',
        borderBottomWidth: 2,
        borderBottomColor: '#F1F5F9',
        paddingBottom: 8,
        marginBottom: 24,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
    },
    inputHalf: {
        flex: 1,
    },
    picker: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
    },
    pickerText: {
        fontSize: 14,
        color: '#1E293B',
    },
    confirmButton: {
        backgroundColor: '#4F46E5',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
    },
    confirmButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
