require('dotenv').config(); // Загружаем .env

const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function fixAdmin() {
  console.log('\n🔧 ENIAC AI - Fix Admin User\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Проверяем подключение
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to database\n');

    // Проверяем есть ли admin
    const checkAdmin = await pool.query(
      'SELECT id, username, is_active, role_id FROM users WHERE username = $1',
      ['admin']
    );

    if (checkAdmin.rows.length === 0) {
      console.log('❌ User "admin" NOT FOUND in database!');
      console.log('📝 Creating new admin user...\n');
      
      // Создаем нового админа
      rl.question('Enter password for new admin: ', async (password) => {
        if (!password || password.length < 4) {
          console.log('❌ Password too short!');
          rl.close();
          await pool.end();
          return;
        }

        const hash = await bcrypt.hash(password, 10);
        
        await pool.query(
          `INSERT INTO users (username, password_hash, full_name, role_id, is_active)
           VALUES ($1, $2, $3, $4, $5)`,
          ['admin', hash, 'Administrator', 1, true]
        );

        console.log('\n✅ Admin user created successfully!');
        console.log('Username: admin');
        console.log('Password: ' + password);
        console.log('\nYou can now login to the system! 🎉\n');
        
        rl.close();
        await pool.end();
      });
    } else {
      const admin = checkAdmin.rows[0];
      console.log('✅ User "admin" FOUND in database');
      console.log('   ID:', admin.id);
      console.log('   Username:', admin.username);
      console.log('   Active:', admin.is_active);
      console.log('   Role ID:', admin.role_id);
      
      if (!admin.is_active) {
        console.log('\n⚠️  Admin is DEACTIVATED!');
        console.log('Activating...');
        await pool.query('UPDATE users SET is_active = true WHERE username = $1', ['admin']);
        console.log('✅ Admin activated!');
      }
      
      console.log('\n📝 Updating admin password...\n');
      
      rl.question('Enter NEW password for admin: ', async (password) => {
        if (!password || password.length < 4) {
          console.log('❌ Password too short!');
          rl.close();
          await pool.end();
          return;
        }

        const hash = await bcrypt.hash(password, 10);
        
        await pool.query(
          'UPDATE users SET password_hash = $1 WHERE username = $2',
          [hash, 'admin']
        );

        console.log('\n✅ Admin password updated successfully!');
        console.log('Username: admin');
        console.log('Password: ' + password);
        console.log('\nYou can now login to the system! 🎉\n');
        
        rl.close();
        await pool.end();
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    rl.close();
  }
}

fixAdmin();