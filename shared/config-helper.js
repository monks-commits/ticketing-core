window.VAConfigHelper = {

  getVenueConfig(CONFIG_VENUES, venueId){
    return CONFIG_VENUES.find(v => v.id === venueId) || null;
  },

  getHallNameByVenue(CONFIG_VENUES, venueId){
    const venue = CONFIG_VENUES.find(v => v.id === venueId);

    return venue?.hall || venueId || "shevchenko-v2";
  },

  getVenueByHall(CONFIG_VENUES, hallName){
    return CONFIG_VENUES.find(v =>
      v.id === hallName || v.hall === hallName
    ) || null;
  }

};
