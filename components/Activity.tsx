
"use client";
import React, { ReactNode } from 'react';

type MyComponentProps = {
    // other props here
    children: ReactNode; // or children?: ReactNode for optional children
  };

export default function Activity(props: MyComponentProps){
    return(
<div
  id="container"
  className="
    fixed inset-0
    m-6            /* gap from all sides */
    mx-auto
    max-w-[1500px]
    max-h-[1000px]
    bg-blue-500
    rounded-2xl
    overflow-hidden
    flex flex-col
  "
>
  {props.children}
</div>



    );
}