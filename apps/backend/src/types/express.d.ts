import 'express';

declare global {
  namespace Express {
    interface UserJwtPayload {
      sub: string;
