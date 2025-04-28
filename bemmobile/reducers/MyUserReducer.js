const MyUserReducer = (state, action) => {
    switch (action.type) {
      case 'LOGIN':
        return action.payload;
      case 'LOGOUT':
        return null;
      default:
        return state;
    }
  };
  
  export default MyUserReducer;