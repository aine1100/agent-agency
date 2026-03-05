const initialState = {
  reservations: [],
};

const reservationReducer = (state = initialState, action) => {
  switch (action.type) {
    // Define your reservation action cases here
    default:
      return state;
  }
};

export default reservationReducer;
