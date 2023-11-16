import { Request, Response } from "express";
import { dataSource } from "../config/dataSource";
import { validate } from "class-validator";
import config from "../config/config";
import { User } from "../entity/User";
import * as jwt from "jsonwebtoken";
import * as jwtDecode from "jwt-decode";
import { FindOneOptions } from "typeorm";

let options: FindOneOptions<User> = {
  select: ["id", "email", "userName", "role", "firstName", "lastName"],
};

class UserController {
  // Authentication

  // eslint-disable-next-line @typescript-eslint/require-await
  static signJWT = async (user: { id: any; email: any; userName: any; role: any; firstName: any; lastName: any }): Promise<string> => {
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        userName: user.userName,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      config.jwtSecret,
      {
        expiresIn: config.expiration,
        issuer: config.issuer,
        audience: config.audience,
      },
    );

    return token;
  };
  static login = async (req: Request, res: Response): Promise<Response> => {
    // Check if email and password are set
    const { email, password } = req.body;
    if (!(email && password)) {
      res.status(400).send();
    }

    // Get user from database
    const userRepository = dataSource.getRepository(User);
    let user: User;
    try {
      user = await userRepository.findOneOrFail({ where: { email } });
    } catch (error) {
      res.status(401).send();
    }

    // Check if encrypted password match
    if (!user.checkIfUnencryptedPasswordIsValid(password)) {
      res.status(401).send();
      return;
    }

    // Sing JWT, valid for 1 hour
    const token = await UserController.signJWT(user);

    // Send the jwt in the response
    return res.send({ token });
  };

  static changePassword = async (req: Request, res: Response): Promise<Response> => {
    // Get ID from JWT
    const token: any = jwtDecode(req.headers.authorization);

    const id: number = token.userId;
    // Get parameters from the body
    const { oldPassword, newPassword } = req.body;
    if (!(oldPassword && newPassword)) {
      res.status(400).send();
    }

    // Get user from the database
    const userRepository = dataSource.getRepository(User);
    let user: User;
    try {
      user = await userRepository.findOneOrFail(options);
    } catch (error) {
      res.status(401).send();
    }

    // Check if old password matchs
    if (!user.checkIfUnencryptedPasswordIsValid(oldPassword)) {
      res.status(401).send("Invalid password or wrong email!");
      return;
    }

    // Validate de model (password lenght)
    user.password = newPassword;
    const errors = await validate(user);
    if (errors.length > 0) {
      res.status(400).send(errors);
      return;
    }
    // Hash the new password and save
    user.hashPassword();
    userRepository.save(user);

    return res.status(204).send();
  };

  // Create & Update
  static newUser = async (req: Request, res: Response): Promise<Response> => {
    // Get parameters from the body
    const { email, password, firstName, lastName, userName } = req.body;
    const user = new User();
    user.email = email;
    user.userName = userName;
    user.password = password;
    user.role = "USER";
    user.firstName = firstName;
    user.lastName = lastName;

    // Validade if the parameters are ok
    const errors = await validate(user);
    if (errors.length > 0) {
      res.status(400).send(errors);
      return;
    }

    // Hash the password, to securely store on DB
    user.hashPassword();

    // Try to save. If fails, the email is already in use
    const userRepository = dataSource.getRepository(User);
    try {
      await userRepository.save(user);
    } catch (e) {
      res.status(409).send("email already in use");
      return;
    }

    // If all ok, send 201 response
    return res.status(201).send("User created");
  };

  static editOwnUser = async (req: Request, res: Response): Promise<Response> => {
    // Get the ID from the url
    const token: any = jwtDecode(req.headers.authorization);

    const id: number = token.userId;
    // Get values from the body
    const { userName, email, firstName, lastName } = req.body;

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
    user.firstName = firstName;
    user.lastName = lastName;
    const errors = await validate(user);
    if (errors.length > 0) {
      res.status(400).send(errors);
      return;
    }

    // Try to save, if fails, that means email already in use
    try {
      await userRepository.save(user);
    } catch (e) {
      res.status(409).send("email already in use");
      return;
    }

    delete user.password;
    // After all send a 204 (no content, but accepted) response
    return res.status(200).send(user);
  };

  static deleteUser = async (req: Request, res: Response): Promise<Response> => {
    // Get the ID from the url
    const token: any = jwtDecode(req.headers.authorization);
    const id: number = token.userId;

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

  // Get user by ID
  static getOneById = async (req: Request, res: Response): Promise<Response> => {
    // Get the ID from the url
    // eslint-disable-next-line radix
    const id: number = parseInt(req.params.id);

    // Get the user from database
    const userRepository = dataSource.getRepository(User);
    try {
      const user = await userRepository.findOneOrFail(options);

      return res.status(200).send(user);
    } catch (error) {
      return res.status(404).send("User not found");
    }
  };

  static getOwnUser = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);

    const id: number = token.userId;

    const userRepository = dataSource.getRepository(User);
    try {
      const user = await userRepository.findOneOrFail(options);
      res.status(200).send(user);
    } catch (error) {
      res.status(404).send("User not found");
      return;
    }
  };
}

export default UserController;
