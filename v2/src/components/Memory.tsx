import React from 'react';
import styled from 'styled-components';
import { getEmotionPercentages, getEmotionGradients } from '../utilities'

interface Props {
  memory: any;
}

interface StyledMemoryProps {
  gradient: string;
}

const Memory: React.FC<Props> = (props) => {

  console.log(props);

  const test = () => { console.log('memory click'); }

  let gradient = props.memory.gradient 
    ? props.memory.gradient.default
    : getEmotionGradients(props.memory.emotions);


  
  const StyledMemory = styled.div`
    width: 35px;
    height: 35px;
    border: 1px solid #ccc;
    border-radius: 50%;
    cursor: pointer;
    background: ${(props: StyledMemoryProps) => props.gradient }
  `;

  
  return (
    <StyledMemory gradient={ gradient } onClick={ test } />
  );
}

export default Memory;