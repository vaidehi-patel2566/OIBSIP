package com.oibsip.guessing;

import java.io.PrintStream;
import java.util.ArrayList;
import java.util.Random;
import java.util.Scanner;

public class NumberGuessingGame {

    private final Scanner input;
    private final PrintStream output;
    private final Random random;

    public NumberGuessingGame(Scanner input, PrintStream output, Random random) {
        this.input = input;
        this.output = output;
        this.random = random;
    }

    public static void main(String[] args) {
        new NumberGuessingGame(new Scanner(System.in), System.out, new Random()).start();
    }

    public void start() {
        output.println("Number Guessing Game");
        Difficulty difficulty = askDifficulty();
        if (difficulty == null) {
            return;
        }

        ArrayList<String> scores = new ArrayList<>();
        int round = 1;
        boolean playAgain = true;
        while (playAgain) {
            int secret = difficulty.minimum + random.nextInt(difficulty.maximum - difficulty.minimum + 1);
            int attemptsUsed = 0;
            boolean won = false;

            output.println();
            output.println("Round " + round);
            output.println("I am thinking of a number between " + difficulty.minimum + " and " + difficulty.maximum + ".");
            output.println("You have " + difficulty.attemptLimit + " attempts.");
            output.println("Attempts used: 0");

            while (attemptsUsed < difficulty.attemptLimit) {
                output.println();
                output.println("Attempt " + (attemptsUsed + 1) + " of " + difficulty.attemptLimit);
                output.print("Enter your guess: ");
                output.flush();
                String line = readLine();
                if (line == null) {
                    return;
                }
                Integer guess = parseGuess(line, difficulty);
                if (guess == null) {
                    output.println("Enter a whole number between " + difficulty.minimum + " and " + difficulty.maximum + ".");
                    continue;
                }

                attemptsUsed++;
                output.println(responseFor(guess, secret));
                output.println("Attempts used: " + attemptsUsed);
                if (guess == secret) {
                    won = true;
                    break;
                }
            }

            String summary;
            if (won) {
                summary = "Round " + round + " — guessed in " + attemptsUsed + " attempts";
            } else {
                output.println("You Lost! The number was " + secret + ".");
                summary = "Round " + round + " — lost after " + attemptsUsed + " attempts";
            }
            scores.add(summary);
            output.println(summary);
            output.println();
            output.println("Score summary");
            for (String score : scores) {
                output.println(score);
            }

            playAgain = askPlayAgain();
            if (playAgain) {
                round++;
            }
        }
        output.println("Thanks for playing.");
    }

    private Difficulty askDifficulty() {
        while (true) {
            output.println("Choose difficulty:");
            output.println("1. Easy (1-50, 10 attempts)");
            output.println("2. Medium (1-100, 7 attempts)");
            output.println("3. Hard (1-200, 5 attempts)");
            output.print("Enter choice: ");
            output.flush();
            String line = readLine();
            if (line == null) {
                return null;
            }
            switch (line.trim()) {
                case "1":
                    return Difficulty.EASY;
                case "2":
                    return Difficulty.MEDIUM;
                case "3":
                    return Difficulty.HARD;
                default:
                    output.println("Enter 1, 2, or 3.");
            }
        }
    }

    private boolean askPlayAgain() {
        while (true) {
            output.print("Play again? (yes/no): ");
            output.flush();
            String line = readLine();
            if (line == null) {
                return false;
            }
            String answer = line.trim();
            if (answer.equalsIgnoreCase("yes") || answer.equalsIgnoreCase("y")) {
                return true;
            }
            if (answer.equalsIgnoreCase("no") || answer.equalsIgnoreCase("n")) {
                return false;
            }
            output.println("Enter yes or no.");
        }
    }

    private Integer parseGuess(String line, Difficulty difficulty) {
        try {
            int guess = Integer.parseInt(line.trim());
            if (guess < difficulty.minimum || guess > difficulty.maximum) {
                return null;
            }
            return guess;
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private String readLine() {
        if (!input.hasNextLine()) {
            return null;
        }
        return input.nextLine();
    }

    static String responseFor(int guess, int secret) {
        if (guess > secret) {
            return "Too High!";
        }
        if (guess < secret) {
            return "Too Low!";
        }
        return "Correct!";
    }

    private enum Difficulty {
        EASY(1, 50, 10),
        MEDIUM(1, 100, 7),
        HARD(1, 200, 5);

        private final int minimum;
        private final int maximum;
        private final int attemptLimit;

        Difficulty(int minimum, int maximum, int attemptLimit) {
            this.minimum = minimum;
            this.maximum = maximum;
            this.attemptLimit = attemptLimit;
        }
    }
}
