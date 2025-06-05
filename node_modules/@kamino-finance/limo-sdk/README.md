## Installation

```shell
# npm
npm install @kamino-finance/limo-sdk

# yarn
yarn add @kamino-finance/limo-sdk
```

**How to use the Limo SDK:**

- `LimoClient` - shopuld be initialised and then called for all operations as well as fetching on-chain data

```
import { LimoClient } from `@kamino-finance/limo-sdk`;

const limoClient = new LimoClient(env.conn, globalConfigPk);
```