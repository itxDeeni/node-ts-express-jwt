import { Request, Response } from "express";
import { dataSource } from "../../config/dataSource";
import { FindOneOptions } from "typeorm";
import { validate } from "class-validator";
import { User } from "../../entity/User";

let options: FindOneOptions<User> = {
  select: ["id", "email", "userName", "role", "firstName", "lastName"],
};

export default class AdminUserController {
  // USERS
  static editUser = async (req: Request, res: Response): Promise<Response> => {
    // Get the ID from the url
    const { id } = req.params;

    // Get values from the body
    const { userName, email, role, firstName, lastName } = req.body;

    // Try to find user on database
    const userRepository = dataSource.getRepository(User);
    let user;
    try {
      user = await userRepository.findOneOrFail(options);
    } catch (error) {
      // If not found, send a 404 response
      res.status(404).send("User not found");
      return;
    }

    // Validate the new values on model
    user.email = email;
    user.userName = userName;
    user.role = role;
    user.firstName = firstName;
    user.lastName = lastName;
    const errors = await validate(user);
    if (errors.length > 0) {
      res.status(400).send(errors);
      return;
    }

    // Try to safe, if fails, that means email already in use
    try {
      await userRepository.save(user);
    } catch (e) {
      res.status(409).send("email already in use");
      return;
    }
    // After all send a 204 (no content, but accepted) response
    return res.status(204).send();
  };

  // Get users
  static getAllUsers = async (req: Request, res: Response): Promise<Response> => {
    // Get users from database
    const userRepository = dataSource.getRepository(User);
    const users = await userRepository.find({
      select: ["id", "email", "userName", "role", "firstName", "lastName"], // We dont want to send the passwords on response
    });

    // Send the users object
    return res.send(users);
  };

  static deleteUser = async (req: Request, res: Response): Promise<Response> => {
    // Get the ID from the url
    const { id } = req.params;

    const userRepository = dataSource.getRepository(User);

    try {
      await userRepository.findOneOrFail(options);
    } catch (error) {
      res.status(404).send("User not found");
      return;
    }
    userRepository.delete(id);

    // After all send a 204 (no content, but accepted) response
    return res.status(204).send();
  };
}
