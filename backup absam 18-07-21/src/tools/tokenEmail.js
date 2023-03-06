import crypto from 'crypto';

export default function TokenEmail(){
    
    const token = crypto.randomBytes(10).toString('hex');

    const now = new Date();
    now.setHours(now.getHours() + 2);

    return ({token, now}); 
}