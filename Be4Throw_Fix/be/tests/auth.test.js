// Unit test register & login (FR-01, FR-02, SDD Skema Pengujian).
// Database diganti tiruan (mock), jadi test tidak menyentuh Neon.
process.env.JWT_SECRET = 'rahasia-khusus-test';

jest.mock('../utils/prisma', () => ({
  user: { findUnique: jest.fn(), create: jest.fn() },
}));
jest.mock('../utils/email', () => ({ sendResetPasswordEmail: jest.fn() }));

const express = require('express');
const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const authRoutes = require('../routes/authRoutes');
const { errorHandler } = require('../middlewares/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

const dataDaftar = { nama: 'Budi', email: 'Budi@Contoh.com', password: 'Rahasia123', konfirmasiPassword: 'Rahasia123' };

beforeEach(() => jest.clearAllMocks());

describe('POST /api/auth/register', () => {
  test('berhasil → 201, password tidak ikut dikirim, role tidak bisa diatur dari body', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(async ({ data }) => ({ id: 1, role: 'pengguna', status: 'aktif', ...data }));

    const res = await request(app).post('/api/auth/register').send({ ...dataDaftar, role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(res.body.data.role).toBe('pengguna');

    const { data } = prisma.user.create.mock.calls[0][0];
    expect(data.email).toBe('budi@contoh.com'); // email disimpan huruf kecil
    expect(data.role).toBeUndefined();
    expect(await bcrypt.compare('Rahasia123', data.passwordHash)).toBe(true); // disimpan sebagai hash
  });

  test('email sudah terdaftar → 409', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1 });
    const res = await request(app).post('/api/auth/register').send(dataDaftar);
    expect(res.status).toBe(409);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  test.each([
    ['nama kosong', { nama: '' }, 'nama'],
    ['format email salah', { email: 'bukan-email' }, 'email'],
    ['password kurang dari 8', { password: 'Abc123', konfirmasiPassword: 'Abc123' }, 'password'],
    ['password tanpa angka', { password: 'RahasiaSekali', konfirmasiPassword: 'RahasiaSekali' }, 'password'],
    ['password tanpa huruf', { password: '12345678', konfirmasiPassword: '12345678' }, 'password'],
    ['konfirmasi tidak sama', { konfirmasiPassword: 'Rahasia124' }, 'konfirmasiPassword'],
  ])('%s → 422', async (_, ubah, field) => {
    const res = await request(app).post('/api/auth/register').send({ ...dataDaftar, ...ubah });
    expect(res.status).toBe(422);
    expect(res.body.errors.map((e) => e.field)).toContain(field);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/login', () => {
  let userAktif;

  beforeAll(async () => {
    userAktif = {
      id: 7, nama: 'Budi', email: 'budi@contoh.com', role: 'pengguna', status: 'aktif',
      passwordHash: await bcrypt.hash('Rahasia123', 4),
    };
  });

  test('berhasil → token JWT berisi id & role, berlaku 1 hari', async () => {
    prisma.user.findUnique.mockResolvedValue(userAktif);
    const res = await request(app).post('/api/auth/login').send({ email: 'budi@contoh.com', password: 'Rahasia123' });

    expect(res.status).toBe(200);
    expect(res.body.data.expiresIn).toBe('1d');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    const payload = jwt.verify(res.body.data.token, process.env.JWT_SECRET);
    expect(payload).toMatchObject({ id: 7, role: 'pengguna' });
  });

  test('"ingat saya" → token berlaku 30 hari', async () => {
    prisma.user.findUnique.mockResolvedValue(userAktif);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'budi@contoh.com', password: 'Rahasia123', ingatSaya: true });
    expect(res.body.data.expiresIn).toBe('30d');
  });

  test('password salah dan email tidak terdaftar → 401 dengan pesan yang sama', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(userAktif);
    const salah = await request(app).post('/api/auth/login').send({ email: 'budi@contoh.com', password: 'Salah1234' });
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const takAda = await request(app).post('/api/auth/login').send({ email: 'x@contoh.com', password: 'Rahasia123' });

    expect(salah.status).toBe(401);
    expect(takAda.status).toBe(401);
    expect(salah.body.message).toBe(takAda.body.message);
  });

  test('akun nonaktif → 403', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...userAktif, status: 'nonaktif' });
    const res = await request(app).post('/api/auth/login').send({ email: 'budi@contoh.com', password: 'Rahasia123' });
    expect(res.status).toBe(403);
  });

  test('email atau password kosong → 422', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: '', password: '' });
    expect(res.status).toBe(422);
    expect(res.body.errors.map((e) => e.field)).toEqual(['email', 'password']);
  });
});
