import React, { useState, useEffect, useRef } from 'react';
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
    SafeAreaView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import * as Notifications from 'expo-notifications';
import * as DB from './src/database/database';

// Configurar como as notificações são exibidas quando o app está em foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export default function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showAddTransaction, setShowAddTransaction] = useState(false);
    const [showAddAccount, setShowAddAccount] = useState(false);
    const [showEditBalance, setShowEditBalance] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [showAccountPicker, setShowAccountPicker] = useState(false);
    const [showAddCategory, setShowAddCategory] = useState(false);

    // Estados de Notificações
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const notificationListener = useRef();
    const responseListener = useRef();

    // Estados de Dados
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([
        'Alimentação',
        'Transporte',
        'Lazer',
        'Moradia',
        'Saúde',
        'Outros'
    ]);
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

    const [editingAccount, setEditingAccount] = useState(null);
    const [newBalance, setNewBalance] = useState('');
    const [newCategory, setNewCategory] = useState('');

    // --- Configurar Notificações ---
    const registerForPushNotificationsAsync = async () => {
        try {
            // Criar canal de notificação para Android
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('financial-alerts', {
                    name: 'Alertas Financeiros',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#4F46E5',
                });
            }

            // Verificar permissões existentes
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            // Solicitar permissões se necessário
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Permissão de notificação negada');
                return false;
            }

            setNotificationsEnabled(true);
            return true;
        } catch (error) {
            console.error('Erro ao configurar notificações:', error);
            return false;
        }
    };

    // Agendar lembrete diário
    const scheduleDailyReminder = async () => {
        try {
            // Cancelar lembretes anteriores
            await Notifications.cancelAllScheduledNotificationsAsync();

            // Agendar lembrete diário às 20h
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: '💰 Lembrete Financeiro',
                    body: 'Não esqueça de registrar seus gastos de hoje!',
                    data: { type: 'daily-reminder' },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DAILY,
                    hour: 20,
                    minute: 0,
                    channelId: 'financial-alerts',
                },
            });

            console.log('Lembrete diário agendado para 20:00');
        } catch (error) {
            console.error('Erro ao agendar lembrete:', error);
        }
    };

    // Enviar notificação de alerta de orçamento
    const sendBudgetAlert = async (percentage) => {
        if (!notificationsEnabled) return;

        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: '⚠️ Alerta de Orçamento',
                    body: `Você já gastou ${Math.round(percentage)}% do seu orçamento mensal!`,
                    data: { type: 'budget-alert' },
                },
                trigger: null, // Enviar imediatamente
            });
        } catch (error) {
            console.error('Erro ao enviar alerta:', error);
        }
    };

    // --- Inicializar Banco de Dados e Notificações ---
    useEffect(() => {
        const initialize = async () => {
            await DB.initDatabase();
            await loadData();
            await checkForUpdates();

            // Configurar notificações
            const notifEnabled = await registerForPushNotificationsAsync();
            if (notifEnabled) {
                await scheduleDailyReminder();
            }
        };
        initialize();

        // Listener para notificações recebidas (app em foreground)
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notificação recebida:', notification);
        });

        // Listener para interações com notificações
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            console.log('Usuário interagiu com notificação:', data);

            // Navegar para a tela apropriada baseado no tipo
            if (data.type === 'budget-alert') {
                setActiveTab('dashboard');
            }
        });

        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, []);

    // --- Verificar Atualizações ---
    const checkForUpdates = async () => {
        if (!__DEV__) {
            try {
                const update = await Updates.checkForUpdateAsync();
                if (update.isAvailable) {
                    Alert.alert(
                        'Atualização Disponível',
                        'Uma nova versão do app está disponível. Deseja atualizar agora?',
                        [
                            {
                                text: 'Depois',
                                style: 'cancel'
                            },
                            {
                                text: 'Atualizar',
                                onPress: async () => {
                                    await Updates.fetchUpdateAsync();
                                    await Updates.reloadAsync();
                                }
                            }
                        ]
                    );
                }
            } catch (error) {
                console.log('Erro ao verificar atualizações:', error);
            }
        }
    };

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

            console.log('📊 Categorias carregadas:', categories);
            console.log('📊 Número de categorias:', Object.keys(categories).length);

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

    const handleEditBalance = async () => {
        if (!newBalance || !editingAccount) return;

        const balance = Number(newBalance.replace(',', '.'));
        await DB.updateAccountBalance(editingAccount.id, balance);
        await loadData();
        setShowEditBalance(false);
        setEditingAccount(null);
        setNewBalance('');
    };

    const handleAddCategory = () => {
        if (!newCategory.trim()) {
            Alert.alert("Erro", "Digite o nome da categoria!");
            return;
        }
        if (categories.includes(newCategory)) {
            Alert.alert("Erro", "Esta categoria já existe!");
            return;
        }
        setCategories([...categories, newCategory]);
        setNewCategory('');
        setShowAddCategory(false);
    };

    const handleDeleteCategory = (category) => {
        Alert.alert(
            "Confirmar",
            `Eliminar categoria "${category}"?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: () => {
                        setCategories(categories.filter(c => c !== category));
                    }
                }
            ]
        );
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

                        {/* Gráfico Circular de Categorias */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="pie-chart-outline" size={16} color="#6366F1" />
                                <Text style={styles.cardTitle}>Gastos por Categoria</Text>
                                <TouchableOpacity
                                    onPress={async () => {
                                        const cats = await DB.getExpensesByCategory();
                                        const allTrans = await DB.getAllTransactions();
                                        Alert.alert(
                                            'Debug Info',
                                            `Categorias: ${JSON.stringify(cats, null, 2)}\n\nTotal Trans: ${allTrans.length}\n\nExpenses mês: ${expensesMonth}`
                                        );
                                    }}
                                    style={{ marginLeft: 8 }}
                                >
                                    <Ionicons name="bug-outline" size={16} color="#6366F1" />
                                </TouchableOpacity>
                            </View>
                            {Object.keys(categoryData).length === 0 ? (
                                <Text style={styles.emptyText}>Sem gastos registados.</Text>
                            ) : (
                                <>
                                    {/* Gráfico Circular */}
                                    <View style={styles.chartContainer}>
                                        <View style={styles.circularChart}>
                                            <Text style={styles.chartCenterValue}>{formatCurrency(expensesMonth)}</Text>
                                            <Text style={styles.chartCenterLabel}>Total gasto</Text>
                                        </View>
                                    </View>

                                    {/* Lista de Categorias com Percentuais */}
                                    {Object.entries(categoryData)
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([cat, amount], idx) => {
                                            const percentage = ((amount / expensesMonth) * 100).toFixed(1);
                                            const colors = ['#10B981', '#6366F1', '#F59E0B', '#EC4899', '#8B5CF6', '#64748B'];
                                            return (
                                                <View key={cat} style={styles.categoryRow}>
                                                    <View style={styles.categoryLeft}>
                                                        <View style={[
                                                            styles.categoryDot,
                                                            { backgroundColor: colors[idx % colors.length] }
                                                        ]} />
                                                        <Text style={styles.categoryName}>{cat}</Text>
                                                    </View>
                                                    <View style={styles.categoryRight}>
                                                        <Text style={styles.categoryAmount}>{formatCurrency(amount)}</Text>
                                                        <Text style={styles.categoryPercentage}>{percentage}%</Text>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                </>
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
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.accountName}>{acc.name}</Text>
                                    <Text style={styles.accountBalance}>{formatCurrency(acc.balance)}</Text>
                                </View>
                                <View style={styles.accountActions}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setEditingAccount(acc);
                                            setNewBalance(String(acc.balance));
                                            setShowEditBalance(true);
                                        }}
                                        style={styles.iconButton}
                                    >
                                        <Ionicons name="create-outline" size={20} color="#6366F1" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => deleteAccountHandler(acc.id)}
                                        style={styles.iconButton}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* CATEGORIAS TAB */}
                {activeTab === 'categories' && (
                    <View style={styles.tabContent}>
                        <View style={styles.tabHeader}>
                            <Text style={styles.tabHeaderTitle}>Categorias</Text>
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => setShowAddCategory(true)}
                            >
                                <Ionicons name="add" size={16} color="#4F46E5" />
                                <Text style={styles.addButtonText}>Adicionar</Text>
                            </TouchableOpacity>
                        </View>

                        {categories.map((cat, idx) => (
                            <View key={cat} style={styles.categoryCard}>
                                <View style={styles.categoryCardLeft}>
                                    <View style={[
                                        styles.categoryCardIcon,
                                        { backgroundColor: ['#10B981', '#6366F1', '#F59E0B', '#EC4899', '#8B5CF6', '#64748B'][idx % 6] + '20' }
                                    ]}>
                                        <Ionicons
                                            name="pricetag"
                                            size={20}
                                            color={['#10B981', '#6366F1', '#F59E0B', '#EC4899', '#8B5CF6', '#64748B'][idx % 6]}
                                        />
                                    </View>
                                    <Text style={styles.categoryCardName}>{cat}</Text>
                                </View>
                                <TouchableOpacity onPress={() => handleDeleteCategory(cat)}>
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
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

                        {/* Verificar Atualizações */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="cloud-download-outline" size={16} color="#6366F1" />
                                <Text style={styles.cardTitle}>Atualizações</Text>
                            </View>
                            <Text style={styles.configSubtitle}>Verifique se há atualizações disponíveis para o aplicativo.</Text>

                            <TouchableOpacity
                                style={styles.updateButton}
                                onPress={async () => {
                                    try {
                                        Alert.alert('Verificando...', 'Procurando atualizações disponíveis.');
                                        const update = await Updates.checkForUpdateAsync();

                                        if (update.isAvailable) {
                                            Alert.alert(
                                                'Atualização Disponível! 🎉',
                                                'Uma nova versão está disponível. Deseja atualizar agora?',
                                                [
                                                    { text: 'Depois', style: 'cancel' },
                                                    {
                                                        text: 'Atualizar Agora',
                                                        onPress: async () => {
                                                            Alert.alert('Baixando...', 'Aguarde enquanto baixamos a atualização.');
                                                            await Updates.fetchUpdateAsync();
                                                            Alert.alert(
                                                                'Pronto!',
                                                                'Atualização baixada. O app será reiniciado.',
                                                                [
                                                                    {
                                                                        text: 'Reiniciar',
                                                                        onPress: () => Updates.reloadAsync()
                                                                    }
                                                                ]
                                                            );
                                                        }
                                                    }
                                                ]
                                            );
                                        } else {
                                            Alert.alert('✅ Tudo Atualizado!', 'Você já está usando a versão mais recente.');
                                        }
                                    } catch (error) {
                                        Alert.alert('Erro', 'Não foi possível verificar atualizações. Verifique sua conexão.');
                                        console.error('Erro ao verificar atualizações:', error);
                                    }
                                }}
                            >
                                <Ionicons name="refresh-outline" size={20} color="#fff" />
                                <Text style={styles.updateButtonText}>Verificar Atualizações</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Configurações de Notificações */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="notifications-outline" size={16} color="#6366F1" />
                                <Text style={styles.cardTitle}>Notificações</Text>
                            </View>
                            <Text style={styles.configSubtitle}>
                                {notificationsEnabled
                                    ? '✅ Notificações ativadas. Você receberá lembretes diários às 20h.'
                                    : '❌ Notificações desativadas. Ative para receber lembretes.'
                                }
                            </Text>

                            <View style={styles.notificationButtonsRow}>
                                <TouchableOpacity
                                    style={[styles.notificationButton, { backgroundColor: '#10B981' }]}
                                    onPress={async () => {
                                        const enabled = await registerForPushNotificationsAsync();
                                        if (enabled) {
                                            await scheduleDailyReminder();
                                            Alert.alert('✅ Notificações Ativadas', 'Você receberá lembretes diários às 20h.');
                                        } else {
                                            Alert.alert('Permissão Negada', 'Vá nas configurações do dispositivo para ativar notificações.');
                                        }
                                    }}
                                >
                                    <Ionicons name="notifications" size={18} color="#fff" />
                                    <Text style={styles.notificationButtonText}>Ativar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.notificationButton, { backgroundColor: '#EF4444' }]}
                                    onPress={async () => {
                                        await Notifications.cancelAllScheduledNotificationsAsync();
                                        setNotificationsEnabled(false);
                                        Alert.alert('🔕 Notificações Desativadas', 'Você não receberá mais lembretes.');
                                    }}
                                >
                                    <Ionicons name="notifications-off" size={18} color="#fff" />
                                    <Text style={styles.notificationButtonText}>Desativar</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.updateButton, { marginTop: 12, backgroundColor: '#8B5CF6' }]}
                                onPress={async () => {
                                    await Notifications.scheduleNotificationAsync({
                                        content: {
                                            title: '🔔 Teste de Notificação',
                                            body: 'As notificações estão funcionando corretamente!',
                                        },
                                        trigger: null,
                                    });
                                    Alert.alert('Enviado!', 'Uma notificação de teste foi enviada.');
                                }}
                            >
                                <Ionicons name="send-outline" size={20} color="#fff" />
                                <Text style={styles.updateButtonText}>Testar Notificação</Text>
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
                    onPress={() => setActiveTab('categories')}
                >
                    <Ionicons
                        name={activeTab === 'categories' ? 'pricetag' : 'pricetag-outline'}
                        size={24}
                        color={activeTab === 'categories' ? '#4F46E5' : '#CBD5E1'}
                    />
                    <Text style={[styles.tabText, activeTab === 'categories' && styles.tabTextActive]}>
                        Categorias
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
                                <TouchableOpacity
                                    style={styles.pickerButton}
                                    onPress={() => setShowCategoryPicker(true)}
                                >
                                    <Text style={styles.pickerButtonText}>
                                        {newTransaction.category || 'Selecionar'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputHalf}>
                                <Text style={styles.inputLabel}>Conta</Text>
                                <TouchableOpacity
                                    style={styles.pickerButton}
                                    onPress={() => setShowAccountPicker(true)}
                                >
                                    <Text style={styles.pickerButtonText}>
                                        {newTransaction.accountId
                                            ? accounts.find(a => a.id === Number(newTransaction.accountId))?.name || 'Selecionar'
                                            : 'Selecionar'
                                        }
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color="#64748B" />
                                </TouchableOpacity>
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

            {/* Modal Picker de Categorias */}
            <Modal
                visible={showCategoryPicker}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCategoryPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.pickerModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Selecionar Categoria</Text>
                            <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                                <Ionicons name="close" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 400 }}>
                            {categories.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={styles.pickerItem}
                                    onPress={() => {
                                        setNewTransaction({ ...newTransaction, category: cat });
                                        setShowCategoryPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerItemText}>{cat}</Text>
                                    {newTransaction.category === cat && (
                                        <Ionicons name="checkmark" size={24} color="#4F46E5" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal Picker de Contas */}
            <Modal
                visible={showAccountPicker}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowAccountPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.pickerModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Selecionar Conta</Text>
                            <TouchableOpacity onPress={() => setShowAccountPicker(false)}>
                                <Ionicons name="close" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 400 }}>
                            {accounts.map((acc) => (
                                <TouchableOpacity
                                    key={acc.id}
                                    style={styles.pickerItem}
                                    onPress={() => {
                                        setNewTransaction({ ...newTransaction, accountId: String(acc.id) });
                                        setShowAccountPicker(false);
                                    }}
                                >
                                    <View>
                                        <Text style={styles.pickerItemText}>{acc.name}</Text>
                                        <Text style={styles.pickerItemSubtext}>{formatCurrency(acc.balance)}</Text>
                                    </View>
                                    {String(newTransaction.accountId) === String(acc.id) && (
                                        <Ionicons name="checkmark" size={24} color="#4F46E5" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal Editar Saldo */}
            <Modal
                visible={showEditBalance}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowEditBalance(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: 300 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Editar Saldo</Text>
                            <TouchableOpacity onPress={() => setShowEditBalance(false)}>
                                <Ionicons name="close" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Conta: {editingAccount?.name}</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Novo Saldo (R$)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0,00"
                                keyboardType="decimal-pad"
                                value={newBalance}
                                onChangeText={setNewBalance}
                                autoFocus
                            />
                        </View>

                        <TouchableOpacity style={styles.confirmButton} onPress={handleEditBalance}>
                            <Text style={styles.confirmButtonText}>Salvar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal Adicionar Categoria */}
            <Modal
                visible={showAddCategory}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowAddCategory(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: 300 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Nova Categoria</Text>
                            <TouchableOpacity onPress={() => setShowAddCategory(false)}>
                                <Ionicons name="close" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Nome da Categoria</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: Educação"
                                value={newCategory}
                                onChangeText={setNewCategory}
                                autoFocus
                            />
                        </View>

                        <TouchableOpacity style={styles.confirmButton} onPress={handleAddCategory}>
                            <Text style={styles.confirmButtonText}>Adicionar</Text>
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
    chartCenterValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    chartCenterLabel: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
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
    categoryCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    categoryCardIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryCardName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
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
    updateButton: {
        backgroundColor: '#10B981',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        flexDirection: 'row',
        gap: 8,
    },
    updateButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    notificationButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 12,
    },
    notificationButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    notificationButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
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
    pickerModal: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        minHeight: 300,
        maxHeight: '80%',
    },
    pickerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    pickerItemText: {
        fontSize: 16,
        color: '#1E293B',
        fontWeight: '500',
    },
    pickerItemSubtext: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
    },
    pickerButton: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    pickerButtonText: {
        fontSize: 16,
        color: '#1E293B',
    },
    pickerButtonPlaceholder: {
        fontSize: 16,
        color: '#94A3B8',
    },
    categoryCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    categoryLeft: {
        flex: 1,
    },
    categoryRight: {
        alignItems: 'flex-end',
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
    },
    categoryPercentage: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
    },
    iconButton: {
        padding: 8,
    },
    accountActions: {
        flexDirection: 'row',
        gap: 8,
    },
    chartContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    circularChart: {
        borderRadius: 999,
        padding: 20,
    },
});
