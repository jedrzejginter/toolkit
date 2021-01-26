import React, { useState, ComponentPropsWithoutRef, createContext, Children, cloneElement, useContext } from 'react';
import ReactDOM from 'react-dom';

function Radio({checked,...props}) {
  return (
    <input
    {...props}
    aria-checked={checked}
    checked={checked}
    type="radio"
    />
  )
}

const Ctx = createContext()

function RadioGroup({name,onChangeValue,value,...props}) {
 return <Ctx.Provider
 {...props}
 value={{
   name,
   currentValue:value,
   onChange: (e) => onChangeValue(e.target.value) }}
   />

}

function RadioWithContext({value,...props}) {
  const {name, currentValue, onChange} = useContext(Ctx)
  return <Radio
  {...props}
  checked={currentValue === value}
  name={name} onChange={onChange} value={value} />
}

function App() {
  const [val, setVal] = useState(null);
  const [val2, setVal2] = useState(null);

  return (<RadioGroup name="rrr" onChangeValue={setVal} value={val}><label><RadioWithContext
  value="1"
  /> Sign up!</label>
  <label><RadioWithContext
  value="2"
  /> Sign in!</label>
  <div>
  <RadioGroup name="rrr2" onChangeValue={setVal2} value={val2}><label><RadioWithContext
  value="1"
  /> uno</label>
  <label><RadioWithContext
  value="2"
  /> dos</label></RadioGroup>
  </div>

  </RadioGroup>)
}

ReactDOM.render(<App />, document.getElementById('root'));
