// Unit test pengaturan akun (FR-06). Database & penyimpanan file diganti tiruan (mock).
process.env.JWT_SECRET = 'rahasia-khusus-test';

jest.mock('../utils/prisma', () => ({
  user: { findUnique: jest.fn(), update: jest.fn() },
  passwordResetToken: { deleteMany: jest.fn() },
  $transaction: jest.fn(),
}));
jest.mock('fs/promises', () => ({ mkdir: jest.fn(), writeFile: jest.fn(), unlink: jest.fn() }));

const express = require('express');
const request = require('supertest');
const bcrypt = require('bcrypt');
const fs = require('fs/promises');
const prisma = require('../utils/prisma');
const { createToken } = require('../utils/token');
const akunRoutes = require('../routes/akunRoutes');
const { errorHandler } = require('../middlewares/errorHandler');
const { deteksiTipeGambar } = require('../utils/fotoProfil');

const app = express();
app.use(express.json());
app.use('/api/akun', akunRoutes);
app.use(errorHandler);

const { token } = createToken({ id: 7, role: 'pengguna' });
const auth = { Authorization: `Bearer ${token}` };

// Byte awal file asli + isi acak
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(20)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(20)]);

let user;

beforeEach(async () => {
  jest.clearAllMocks();
  user = {
    id: 7, nama: 'Budi', email: 'budi@contoh.com', role: 'pengguna', status: 'aktif',
    username: null, fotoProfil: null, passwordHash: await bcrypt.hash('Rahasia123', 4),
  };
  // requireAuth & controller sama-sama membaca user lewat findUnique
  prisma.user.findUnique.mockImplementation(async () => user);
  prisma.user.update.mockImplementation(async ({ data }) => ({ ...user, ...data }));
  prisma.$transaction.mockResolvedValue([]);
});

describe('requireAuth', () => {
  test('tanpa token → 401', async () => {
    const res = await request(app).put('/api/akun/profil').send({ nama: 'Andi' });
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/akun/profil', () => {
  test('ubah sebagian field → 200, string kosong disimpan null', async () => {
    const res = await request(app).put('/api/akun/profil').set(auth)
      .send({ nama: '  Andi  ', username: 'Andi_99', noTelepon: '0812-3456 7890', domisili: '' });

    expect(res.status).toBe(200);
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({
      nama: 'Andi', username: 'andi_99', noTelepon: '081234567890', domisili: null,
    });
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  test('email tidak bisa diubah → 422', async () => {
    const res = await request(app).put('/api/akun/profil').set(auth).send({ email: 'baru@contoh.com' });
    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe('email');
  });

  test.each([
    ['nama kosong', { nama: '  ' }, 'nama'],
    ['username terlalu pendek', { username: 'ab' }, 'username'],
    ['username ada spasi', { username: 'andi budi' }, 'username'],
    ['nomor telepon salah', { noTelepon: '12345' }, 'noTelepon'],
  ])('%s → 422', async (_, body, field) => {
    const res = await request(app).put('/api/akun/profil').set(auth).send(body);
    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe(field);
  });

  test('username sudah dipakai → 409', async () => {
    prisma.user.update.mockRejectedValue(Object.assign(new Error('unik'), { code: 'P2002' }));
    const res = await request(app).put('/api/akun/profil').set(auth).send({ username: 'dipakai' });
    expect(res.status).toBe(409);
    expect(res.body.errors[0].field).toBe('username');
  });

  test('body kosong → 200 "Tidak ada perubahan"', async () => {
    const res = await request(app).put('/api/akun/profil').set(auth).send({});
    expect(res.body.message).toBe('Tidak ada perubahan');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('PUT /api/akun/password', () => {
  const body = { passwordLama: 'Rahasia123', passwordBaru: 'BaruSekali9', konfirmasiPassword: 'BaruSekali9' };

  test('berhasil → 200, password baru disimpan sebagai hash', async () => {
    const res = await request(app).put('/api/akun/password').set(auth).send(body);
    expect(res.status).toBe(200);
    const { passwordHash } = prisma.user.update.mock.calls[0][0].data;
    expect(await bcrypt.compare('BaruSekali9', passwordHash)).toBe(true);
    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalled(); // link reset lama dimatikan
  });

  test('password lama salah → 422', async () => {
    const res = await request(app).put('/api/akun/password').set(auth).send({ ...body, passwordLama: 'Salah1234' });
    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe('passwordLama');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  test('password baru sama dengan lama → 422', async () => {
    const res = await request(app).put('/api/akun/password').set(auth)
      .send({ passwordLama: 'Rahasia123', passwordBaru: 'Rahasia123', konfirmasiPassword: 'Rahasia123' });
    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe('passwordBaru');
  });

  test.each([
    ['password baru lemah', { passwordBaru: 'abc', konfirmasiPassword: 'abc' }, 'passwordBaru'],
    ['konfirmasi tidak sama', { konfirmasiPassword: 'BedaSekali9' }, 'konfirmasiPassword'],
  ])('%s → 422', async (_, ubah, field) => {
    const res = await request(app).put('/api/akun/password').set(auth).send({ ...body, ...ubah });
    expect(res.status).toBe(422);
    expect(res.body.errors.map((e) => e.field)).toContain(field);
  });
});

describe('PUT /api/akun/foto', () => {
  test('foto JPG → 200, file ditulis, fotoProfil diisi path /uploads/profil/', async () => {
    user.fotoProfil = '/uploads/profil/7-lama.png';
    const res = await request(app).put('/api/akun/foto').set(auth).attach('foto', JPG, 'saya.jpg');

    expect(res.status).toBe(200);
    expect(res.body.data.fotoProfil).toMatch(/^\/uploads\/profil\/7-\d+\.jpg$/);
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
    expect(fs.unlink.mock.calls[0][0]).toMatch(/7-lama\.png$/); // foto lama dihapus
  });

  test('tanpa file → 422', async () => {
    const res = await request(app).put('/api/akun/foto').set(auth);
    expect(res.status).toBe(422);
  });

  test('bukan gambar (walau namanya .jpg) → 422', async () => {
    const res = await request(app).put('/api/akun/foto').set(auth).attach('foto', Buffer.from('bukan gambar sama sekali'), 'palsu.jpg');
    expect(res.status).toBe(422);
    expect(res.body.errors[0].message).toContain('JPG, PNG, atau WebP');
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  test('lebih dari 2 MB → 422', async () => {
    const besar = Buffer.concat([JPG, Buffer.alloc(2 * 1024 * 1024)]);
    const res = await request(app).put('/api/akun/foto').set(auth).attach('foto', besar, 'besar.jpg');
    expect(res.status).toBe(422);
    expect(res.body.errors[0].message).toBe('Ukuran foto maksimal 2 MB');
  });

  test('DELETE /api/akun/foto → fotoProfil jadi null', async () => {
    user.fotoProfil = '/uploads/profil/7-lama.png';
    const res = await request(app).delete('/api/akun/foto').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.fotoProfil).toBeNull();
  });
});

describe('deteksiTipeGambar', () => {
  test.each([[JPG, 'jpg'], [PNG, 'png'], [WEBP, 'webp']])('mengenali %#', (buf, tipe) => {
    expect(deteksiTipeGambar(buf)).toBe(tipe);
  });

  test('GIF / teks / kosong → null', () => {
    expect(deteksiTipeGambar(Buffer.from('GIF89a000000000'))).toBeNull();
    expect(deteksiTipeGambar(Buffer.from('halo'))).toBeNull();
    expect(deteksiTipeGambar(null)).toBeNull();
  });
});
