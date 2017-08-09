import { parse as parseUrl } from 'url';

class Router {
  constructor(opts) {
    const config = this.config = opts.config;
    this.store = opts.store;
    this.controller = opts.controller;
    this.eventBus = opts.eventBus;
    this.dataManager = opts.dataManager;
    this.history = window.history;

    // check if the router should be silent (i.e. not update the url or listen
    // for hash changes)
    const silent = this.silent = !config.router || !config.router.enabled;

    // only listen for route changes if routing is enabled
    if (!silent) {
      window.onhashchange = this.hashChanged.bind(this);
    }
  }

  makeHash(address, topic) {
    console.log('make hash', address, topic);

    // must have an address
    if (!address || address.length === 0) {
      return null;
    }

    let hash = `#/${address}`;
    if (topic) {
      hash += `/${topic}`;
    }

    return hash;
  }

  getAddressFromState() {
    // TODO add an address getter fn to config so this isn't ais-specific
    const geocodeData = this.store.state.geocode.data || {};
    const props = geocodeData.properties || {};
    return props.street_address;
  }

  hashChanged() {
    const location = window.location;
    const hash = location.hash;

    // console.log('hash changed =>', hash);

    // parse url
    const comps = parseUrl(location.href);
    const query = comps.query;

    // handle ?search entry point
    if (query && query.search) {
      // TODO
    }

    // parse path
    const pathComps = hash.split('/').splice(1);
    const addressComp = pathComps[0];

    // if there's no address, don't do anything
    if (!addressComp) {
      // console.log('no address, returning');
      return;
    }

    const nextAddress = decodeURIComponent(addressComp);
    let nextTopic;

    if (pathComps.length > 1) {
      nextTopic = decodeURIComponent(pathComps[1]);
    }

    this.route(nextAddress, nextTopic);
  }

  routeToAddress(nextAddress) {
    // console.log('Router.routeToAddress', nextAddress);

    if (nextAddress) {
      // check against current address
      const prevAddress = this.getAddressFromState();

      // if the hash address is different, geocode
      if (!prevAddress || nextAddress !== prevAddress) {
        this.dataManager.geocode(nextAddress)
                        .then(this.didGeocode.bind(this));
      }
    }

    // the following code doesn't seem to be needed anymore. it's probably
    // happening in didGeocode.
    // if not silent, update hash. this is needed for updating the hash after
    // topic clicks.
    // if (!this.silent) {
    //   const prevOrNextAddress = nextAddress || this.getAddressFromState();
    //   const nextHash = this.makeHash(prevOrNextAddress, nextTopic);
    //
    //   if (nextHash) {
    //     // TODO replace state
    //     const prevState = this.history.state;
    //     // this.history.replaceState(prevState, null, nextHash);
    //
    //     // window.location.hash = nextHash;
    //   }
    // }
  }

  // this gets called when you click a topic header.
  routeToTopic(nextTopic) {
    // check against active topic
    const prevTopic = this.store.state.activeTopic;

    if (!prevTopic || prevTopic !== nextTopic) {
      this.store.commit('setActiveTopic', nextTopic);
    }

    if (!this.silent) {
      const address = this.getAddressFromState();
      const nextHash = this.makeHash(address, nextTopic);
      const lastHistoryState = this.history.state;
      this.history.replaceState(lastHistoryState, null, nextHash);
    }
  }

  didGeocode() {
    console.log('Router.didGeocode');

    // update url
    // REVIEW this is ais-specific
    const geocodeData = this.store.state.geocode.data;
    const address = geocodeData.properties.street_address;
    const topic = this.store.state.activeTopic;

    // REVIEW this is only pushing state when routing is turned on. but maybe we
    // want this to happen all the time, right?
    if (!this.silent) {
      // push state
      const nextHistoryState = {
        geocode: geocodeData
      };
      const nextHash = this.makeHash(address, topic);

      this.history.pushState(nextHistoryState, null, nextHash);
    }
  }
}

export default Router;