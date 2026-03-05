import { createStore, combineReducers } from 'redux';
import menuReducer from './reducers/menuReducer';
import orderReducer from './reducers/orderReducer';
import reservationReducer from './reducers/reservationReducer';

const rootReducer = combineReducers({
  menu: menuReducer,
  orders: orderReducer,
  reservations: reservationReducer,
});

const store = createStore(rootReducer);

export default store;
