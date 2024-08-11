import type { MetaFunction } from "@remix-run/node";

import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Link,
  Text,
  TextField,
} from "@radix-ui/themes";

// import "@radix-ui/themes/styles.css";

// Base theme tokens
import "@radix-ui/themes/tokens/base.css";

// Include just the colors you use, for example `ruby`, `teal`, and `slate`.
// Remember to import the gray tint that matches your theme setting.
//import '@radix-ui/themes/tokens/colors/ruby.css';
import "@radix-ui/themes/tokens/colors/teal.css";
import "@radix-ui/themes/tokens/colors/slate.css";

// Rest of the CSS
import "@radix-ui/themes/components.css";
import "@radix-ui/themes/utilities.css";

export const meta: MetaFunction = () => {
  return [
    { title: "Certificates" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  return (
    <Flex>
      <Card size="4">
        <Heading as="h3" size="6" trim="start" mb="5">
          Sign up
        </Heading>

        <Box mb="5">
          <Flex mb="1">
            <Text
              as="label"
              htmlFor="example-email-field"
              size="2"
              weight="bold"
            >
              Email address
            </Text>
          </Flex>
          <TextField.Root
            placeholder="Enter your email"
            id="example-email-field"
          />
        </Box>

        <Box mb="5" position="relative">
          <Flex align="baseline" justify="between" mb="1">
            <Text
              as="label"
              size="2"
              weight="bold"
              htmlFor="example-password-field"
            >
              Password
            </Text>
            <Link href="#" size="2" onClick={(e) => e.preventDefault()}>
              Forgot password?
            </Link>
          </Flex>
          <TextField.Root
            placeholder="Enter your password"
            id="example-password-field"
          />
        </Box>

        <Flex mt="6" justify="end" gap="3">
          <Button variant="outline">Create an account</Button>
          <Button>Sign in</Button>
        </Flex>
      </Card>
    </Flex>
  );
}
