import { Router } from 'express';
import authRouter from './auth';
import serversRouter from './servers';
import channelsRouter from './channels';
import dmsRouter from './dms';
import filesRouter from './files';
import usersRouter from './users';

const router = Router();

router.use('/auth', authRouter);
router.use('/servers', serversRouter);
router.use('/', channelsRouter);
router.use('/dms', dmsRouter);
router.use('/files', filesRouter);
router.use('/users', usersRouter);

export default router;
