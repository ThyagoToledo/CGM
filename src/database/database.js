import * as SQLite from 'expo-sqlite';

// Abrir/criar banco de dados
let db = null;

// Helper para garantir que db está inicializado
const ensureDbInitialized = async () => {
    if (!db) {
        db = await SQLite.openDatabaseAsync('financias.db');
    }
    return db;
};

// Inicializar banco de dados com tabelas
export const initDatabase = async () => {
    try {
        db = await SQLite.openDatabaseAsync('financias.db');

        // Criar tabela de contas
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        balance REAL NOT NULL DEFAULT 0,
        color TEXT NOT NULL DEFAULT '#64748b',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Criar tabela de transações
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        category TEXT NOT NULL,
        account_id INTEGER NOT NULL,
        account_name TEXT NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `);

        // Criar tabela de configurações
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY CHECK(id = 1),
        daily_rate REAL NOT NULL DEFAULT 100,
        days_per_week INTEGER NOT NULL DEFAULT 5,
        manual_override INTEGER NOT NULL DEFAULT 0,
        manual_amount REAL NOT NULL DEFAULT 3000
      );
    `);

        // Inserir configuração padrão se não existir
        const configExists = await db.getFirstAsync('SELECT * FROM config WHERE id = 1');
        if (!configExists) {
            await db.runAsync('INSERT INTO config (id) VALUES (1)');
        }

        // Inserir contas padrão se não existirem
        const accountsCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM accounts');
        if (accountsCount.count === 0) {
            await db.runAsync(
                'INSERT INTO accounts (name, balance, color) VALUES (?, ?, ?)',
                ['Nubank', 1500.00, '#8B5CF6']
            );
            await db.runAsync(
                'INSERT INTO accounts (name, balance, color) VALUES (?, ?, ?)',
                ['Carteira', 150.00, '#10B981']
            );
        }

        console.log('✅ Banco de dados inicializado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao inicializar banco de dados:', error);
    }
};

// --- OPERAÇÕES DE CONTAS ---

export const getAccounts = async () => {
    try {
        const database = await ensureDbInitialized();
        return await database.getAllAsync('SELECT * FROM accounts ORDER BY created_at ASC');
    } catch (error) {
        console.error('Erro ao buscar contas:', error);
        return [];
    }
};

export const addAccount = async (name, initialBalance, color = '#64748b') => {
    try {
        const database = await ensureDbInitialized();
        const result = await database.runAsync(
            'INSERT INTO accounts (name, balance, color) VALUES (?, ?, ?)',
            [name, initialBalance, color]
        );
        return result.lastInsertRowId;
    } catch (error) {
        console.error('Erro ao adicionar conta:', error);
        return null;
    }
};

export const updateAccountBalance = async (accountId, newBalance) => {
    try {
        const database = await ensureDbInitialized();
        await database.runAsync('UPDATE accounts SET balance = ? WHERE id = ?', [newBalance, accountId]);
        return true;
    } catch (error) {
        console.error('Erro ao atualizar saldo:', error);
        return false;
    }
};

export const deleteAccount = async (accountId) => {
    try {
        const database = await ensureDbInitialized();
        await database.runAsync('DELETE FROM accounts WHERE id = ?', [accountId]);
        await database.runAsync('DELETE FROM transactions WHERE account_id = ?', [accountId]);
        return true;
    } catch (error) {
        console.error('Erro ao deletar conta:', error);
        return false;
    }
};

// --- OPERAÇÕES DE TRANSAÇÕES ---

export const getTransactions = async (limit = 100) => {
    try {
        const database = await ensureDbInitialized();
        return await database.getAllAsync(
            'SELECT * FROM transactions ORDER BY date DESC LIMIT ?',
            [limit]
        );
    } catch (error) {
        console.error('Erro ao buscar transações:', error);
        return [];
    }
};

export const addTransaction = async (description, amount, type, category, accountId, accountName) => {
    try {
        const database = await ensureDbInitialized();
        // Iniciar transação SQL
        await database.execAsync('BEGIN TRANSACTION');

        // Inserir transação
        const result = await database.runAsync(
            `INSERT INTO transactions (description, amount, type, category, account_id, account_name, date) 
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
            [description, amount, type, category, accountId, accountName]
        );

        // Atualizar saldo da conta
        const account = await database.getFirstAsync('SELECT balance FROM accounts WHERE id = ?', [accountId]);
        const newBalance = type === 'income'
            ? account.balance + amount
            : account.balance - amount;

        await database.runAsync('UPDATE accounts SET balance = ? WHERE id = ?', [newBalance, accountId]);

        await database.execAsync('COMMIT');
        return result.lastInsertRowId;
    } catch (error) {
        const database = await ensureDbInitialized();
        await database.execAsync('ROLLBACK');
        console.error('Erro ao adicionar transação:', error);
        return null;
    }
};

export const deleteTransaction = async (transactionId) => {
    try {
        const database = await ensureDbInitialized();
        await database.runAsync('DELETE FROM transactions WHERE id = ?', [transactionId]);
        return true;
    } catch (error) {
        console.error('Erro ao deletar transação:', error);
        return false;
    }
};

// Buscar gastos por período
export const getExpensesByPeriod = async (period = 'month') => {
    try {
        const database = await ensureDbInitialized();
        let query = '';

        if (period === 'today') {
            query = `
        SELECT SUM(amount) as total 
        FROM transactions 
        WHERE type = 'expense' 
        AND date(date) = date('now', 'localtime')
      `;
        } else if (period === 'month') {
            query = `
        SELECT SUM(amount) as total 
        FROM transactions 
        WHERE type = 'expense' 
        AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now', 'localtime')
      `;
        }

        const result = await database.getFirstAsync(query);
        return result?.total || 0;
    } catch (error) {
        console.error('Erro ao buscar gastos:', error);
        return 0;
    }
};

// Buscar gastos por categoria
export const getExpensesByCategory = async () => {
    try {
        const database = await ensureDbInitialized();
        const results = await database.getAllAsync(`
      SELECT category, SUM(amount) as total
      FROM transactions
      WHERE type = 'expense'
      AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now', 'localtime')
      GROUP BY category
      ORDER BY total DESC
    `);

        console.log('🔍 Query results from DB:', results);

        const categoryData = results.reduce((acc, curr) => {
            acc[curr.category] = curr.total;
            return acc;
        }, {});

        console.log('🔍 Category data formatted:', categoryData);

        return categoryData;
    } catch (error) {
        console.error('Erro ao buscar gastos por categoria:', error);
        return {};
    }
};

// --- OPERAÇÕES DE CONFIGURAÇÃO ---

export const getConfig = async () => {
    try {
        const database = await ensureDbInitialized();
        return await database.getFirstAsync('SELECT * FROM config WHERE id = 1');
    } catch (error) {
        console.error('Erro ao buscar configuração:', error);
        return {
            daily_rate: 100,
            days_per_week: 5,
            manual_override: 0,
            manual_amount: 3000
        };
    }
};

export const updateConfig = async (dailyRate, daysPerWeek, manualOverride, manualAmount) => {
    try {
        const database = await ensureDbInitialized();
        await database.runAsync(
            `UPDATE config 
       SET daily_rate = ?, days_per_week = ?, manual_override = ?, manual_amount = ?
       WHERE id = 1`,
            [dailyRate, daysPerWeek, manualOverride ? 1 : 0, manualAmount]
        );
        return true;
    } catch (error) {
        console.error('Erro ao atualizar configuração:', error);
        return false;
    }
};

export default db;
