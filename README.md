# CasperData a Casper Blockchain parser
[![codecov](https://codecov.io/gh/casperholders/casperdata/branch/main/graph/badge.svg?token=J111YFA2Q3)](https://codecov.io/gh/casperholders/casperdata)

# How to build

## Local dev

```bash
yarn install
yarn start
```

## Local tests

### Run lint
```bash
yarn lint
```

### Run tests
```bash
yarn test
```

## Technical information & Database config

The different .env file are here only for example. When you run the project locally it will use the .env file
and the database config file located at `config/config.json`.

View the documentation for sequelize config file [here](https://sequelize.org/master/manual/migrations.html#configuration).

If the file is not present the software will try to use the environnement variables to connect to the database with the default env key : `DATABASE_URL`.

**The same behavior is used within the generated binary.**

## Api endpoints

No api endpoint are available with this software.

## Env File explanation

```
DATABASE_URL=postgres://postgres:mysecretpassword@127.0.0.1:5432/testnet //Example of database url for postgres
RPC_URL=http://localhost:8080/rpc //Example of url for a casper node url
LIMIT_BULK_INSERT=10000 //Limit of entries to insert at once in the DB
BASE_RANDOM_THROTTLE_NUMBER=3 //Base random throttle number use to throttle RPC call. Random number number generated will range from 1 and n+1
NODE_ENV=production //Node environnement. Used primarily to define which database config to use.
LOOP=60 //If set the programm will loop every x seconds
```

## Production build

This will produce a binary in the `bin/` folder.

```bash
yarn build
```

## Docker build

```bash
docker build . 
```

## Kubernetes deployment

### Warning: The current kubernetes files are specific to my kubenertes architecture. It's basically an example how to use CasperHolders on Kubernetes.

```bash
kubectl apply -f kubernetes/
```
