## Deploy Instruction Wallet
- [ ] Create a branch from develop(most updated)   with proper version number
- [ ] Take a pull of that branch and build## Deploy Instruction Wallet
- [ ] create a subdomain for the wallet as (wallet-testnet.hypersign.id)
- [ ] Create a s3 bucket with policy getObjects 
- [ ] Create invalidations /*




## Deploy Instruction Authserver
- [ ] Create a branch from develop(most updated)   with proper version number
- [ ] Setup redis server with redisearch module (https://redis.io/docs/stack/search/quick_start/)
- [ ] Follow Build from source instruction in the above link 
- [ ] Generate redisearch.so (LITE OSS) and copy it to /usr/lib/redisearch.so
- [ ] add the path '/usr/lib/redisearch.so' to  /etc/redis/redis.conf as loadmodule
- [ ] restart the redis server
- [ ] check if redisearch module is loaded by running redis-cli and running command 'MODULE LIST'  (https://redis.io/commands/module-list) OUTPUT should be like this
```
 1) "name"
 2) "searchlight"
 3) "ver"
 4) (integer) 999999
   ```
- [ ] Take a pull of that versioned branch
- [ ] npm install
- [ ] npm run build
- [ ] pm2 start "npm run start" --name "Authserver"
- [ ] pm2 start "npm run service:start" --name "Authserver:Txn-Service"