# CasperData a Casper Blockchain parser
[![codecov](https://codecov.io/gh/casperholders/casperdata/branch/main/graph/badge.svg?token=J111YFA2Q3)](https://codecov.io/gh/casperholders/casperdata)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=casperholders_casperdata&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=casperholders_casperdata)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=casperholders_casperdata&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=casperholders_casperdata)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=casperholders_casperdata&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=casperholders_casperdata)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=casperholders_casperdata&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=casperholders_casperdata)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=casperholders_casperdata&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=casperholders_casperdata)

Casper Data is an independent piece of software that parse the Casper Network blockchain into a postgresql database.

You are free to build an API or any type of interaction with the database built by the software.

For example CasperHolders use [**postgrest**](https://postgrest.org/en/stable/) to serve a restful API from the database build by this software.

The kubernetes configs are available freely in the kubernetes folder for you but that's specific to the CasperHolders infrastructure (or you can see the docker installation steps [here](https://postgrest.org/en/stable/install.html#docker)).

The data parsed with this software are chosen especially for the CasperHolders needs. If you need / want other types of data feel free to open an issue or fork the repo.


# Bugs

- Casper JS SDK doesn't support all types conversion to toBytes for now so some deploy can't be parsed.
(70~ in testnet & 2~ in mainnet). The next release of the software will self-heal when the SDK will support those types.

- If the software is reporting a lot of timeout you can change the BASE_RANDOM_THROTTLE_NUMBER to a higher value (Can be usefull if you have a bad internet connection or your computer / server is located outside of EU this a majority of node are EU based)
- In the event of the software crash because of a heap memory issue you can increase the node heap or lower the LIMIT_BULK_INSERT (this will do more frequent insert in the database)

# Next features

[ ] Staking rewards

[ ] Validator downtime

[ ] MAKE Account info cache

[ ] ERC20 Full support

## Technical information & Database config

The software works with a postgresql database. The tests are run with a sqllite in memory database.

We recommend you to use a postgresql database with this software. We won't officially support other types of databases.

Exemple to run a local postgres db :

```bash
sudo docker run --name some-postgres -p 5432:5432 -e POSTGRES_PASSWORD=mysecretpassword -e POSTGRES_DB=testnet -d postgres
```

The different .env file are here only for example. When you run the project locally it will use the .env file
and the database config file located at `config/config.json`.

View the documentation for sequelize config file [here](https://sequelize.org/master/manual/migrations.html#configuration).

If the file is not present the software will try to use the environnement variables to connect to the database with the default env key : `DATABASE_URL`.

When you launch the software it will run all migrations automatically.

If you want to speed up the process you can find daily backups here : [mainnet](https://backup.casperholders.io/) / [testnet](https://backup.testnet.casperholders.io/)

Import the backup into your database with `psql dbname < dumpfile` (cf https://www.postgresql.org/docs/current/backup-dump.html)

**The same behavior is used within the generated binary.**

# How to build

## Local dev

### Make sure to setup your database & config correctly before that.

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

## Api endpoints

No api endpoint are available with this software.

## Env File explanation

```
DATABASE_URL=postgres://postgres:mysecretpassword@127.0.0.1:5432/testnet //Example of database url for postgres
RPC_URL=http://localhost:8080/rpc //Example of url for a casper node url
LIMIT_BULK_INSERT=10000 //Limit of entries to insert at once in the DB
BASE_RANDOM_THROTTLE_NUMBER=100 //Base random throttle number use to throttle RPC call. Random number number generated will range from 1 and n+1
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
kubectl apply -f kubernetes/(testnet|mainnet)/
```
