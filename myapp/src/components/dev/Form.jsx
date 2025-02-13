import React from 'react';

function Form() {
  return (
    <div className="info">
      <div className="form">
        <form>
          <label htmlFor="name"> Name:</label><br /><br />
          <input type="text" id="fname" name="fname" defaultValue="" /><br /><br />
          <label htmlFor="cname">Company Name:</label><br /><br />
          <input type="text" id="cname" name="cname" defaultValue="" /><br /><br />
          <label htmlFor="phoneno">Mobile No:</label><br /><br />
          <input type="text" id="phoneno" name="phoneno" defaultValue="" /><br /><br />
        </form>
        <label htmlFor="response">Response:</label><br /><br />
        <input type="text" id="response" name="response" defaultValue="" /><br /><br />
      </div>
    </div>
  );
}

export default Form;
