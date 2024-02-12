### Readme

### Node
- #### Node installation on Windows

  Just go on [official Node.js website](https://nodejs.org/) and download the installer.
Also, be sure to have `git` available in your PATH, `npm` might need it (You can find git [here](https://git-scm.com/)).

- #### Node installation on Ubuntu

  You can install nodejs and npm easily with apt install, just run the following commands.

      $ sudo apt install nodejs
      $ sudo apt install npm

- #### Other Operating Systems
  You can find more information about the installation on the [official Node.js website](https://nodejs.org/) and the [official NPM website](https://npmjs.org/).

If the installation was successful, you should be able to run the following command.

    $ node --version

    $ npm --version

If you need to update `npm`, you can make it using `npm`! Cool right? After running the following command, just open again the command line and be happy.

    $ npm install npm -g

---

## Install

    $ git clone https://github.com/Manan-Nagpal1311/BackendWeatherAPI.git
    $ npm install

## Configure application

- Please install the redis on local or change the port to suitable remote redis server deployed
- Guide for redis installation (https://redis.io/docs/install/install-redis/)
- Please recheck the MONGO_URI which is present in .env , should work for everyone because access is global as now
- Please recheck the port for express server

## Running the project

    $ node index.js

## Final

- Curls mentioned above each api
