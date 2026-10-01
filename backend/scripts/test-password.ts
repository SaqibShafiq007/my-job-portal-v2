import { hashPassword, verifyPassword } from '../src/shared/password';

async function test() {
  const start = Date.now();
  const hash = await hashPassword('test123');
  const elapsed = Date.now() - start;

  console.log('Hash:', hash);
  console.log(`hashPassword took ${elapsed}ms`);

  const match = await verifyPassword('test123', hash);
  console.log('Correct password match:', match); // should be true

  const noMatch = await verifyPassword('wrong', hash);
  console.log('Wrong password match:', noMatch); // should be false
}

test();