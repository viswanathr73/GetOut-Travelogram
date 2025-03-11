import React from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const Signup = () => {
  return (
    <div className="flex items-center w-screen h-screen justify-center">
      <form action="" className="shadow-lg flex flex-col gap-5 p-8">
        <div className="my-4">
          <h1 className="text-center font-bold text-xl">LOGO</h1>
          <p>Signup to see photos & videps from your friends</p>
        </div>
        <div>
          <span className="font-medium">Username</span>
          <Input type="text" className="focus-visible:ring-transparent my-2" />
        </div>
        <div>
          <span className="font-medium">Email</span>
          <Input type="text" className="focus-visible:ring-transparent my-2" />
        </div>
        <div>
          <span className="font-medium">Password</span>
          <Input type="text" className="focus-visible:ring-transparent my-2" />
        </div>
        <Button>Signup</Button>
      </form>
    </div>
  );
};

export default Signup;
