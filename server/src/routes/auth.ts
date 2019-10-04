import express from 'express';
import { sign } from 'jsonwebtoken';
import { compare, hash } from 'bcryptjs';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Request } from '../context';

export const authRouter = express.Router();

authRouter.post('/login', async (req: Request, res: any) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ message: 'Inavlid Request' });
  }

  const user = await req.db.collection('users').findOne({ email });

  if (!user) {
    return res.status(400).json({ message: 'Incorrect email.' });
  }

  const passwordValid = await compare(password, user.password);
  if (!passwordValid) {
    return res.status(400).json({ message: 'Incorrect password.' });
  }

  const token = sign(
    {
      id: user._id,
      isAdmin: !!user.isAdmin,
      email: user.email
    },
    process.env.JWT_AUTH_SECRET
  );
  res.status(200).json({
    token
  });
});
