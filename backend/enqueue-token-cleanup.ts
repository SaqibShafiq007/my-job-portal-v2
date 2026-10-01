import 'dotenv/config';
import queue from './src/shared/queue';

(async () => {
  await queue.add('cleanup-expired-refresh-tokens', {});
  console.log('Job enqueued');
  await queue.close();
})();
