import setupCmd from './setcmdArgs';
import app from './app';
setupCmd().then(r => { if (r) { app(); } })