"use client";
import {
  Box,
  Flex,
  Link,
  Button,
  useColorModeValue,
  Stack,
  useColorMode,
  useDisclosure,
  HStack,
  IconButton,
  Heading,
} from "@chakra-ui/react";
import NextLink, { LinkProps } from "next/link";
import { HamburgerIcon, CloseIcon, SunIcon, MoonIcon } from "@chakra-ui/icons";
import { usePathname } from "next/navigation";
import { ModalLocation, OthentLogin } from "@/components/othent";
import { usePersistStore } from "@/lib/store";

interface NavItem {
  key: number;
  label: string;
  href?: string;
}

interface NavLinkProps extends LinkProps {
  children?: string | React.ReactNode;
  href: string;
}

const NavItems: Array<NavItem> = [
  {
    key: 0,
    label: "Archive",
    href: "/archive",
  },
  {
    key: 1,
    label: "My Archives",
    href: "/my-archives",
  },
];

const Logo = () => {
  return (
    <svg
      height={32}
      viewBox="0 0 28 28"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "inline", color: "blue" }}
    >
      <image xlinkHref="/logo.svg" height="28" />
    </svg>
  );
};

const NavLink = ({ href, children }: NavLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  const color = useColorModeValue("#0E76FD", "selected");
  const bg = useColorModeValue("gray.200", "gray.700");

  if (isActive) {
    return (
      <NextLink href={href} passHref>
        <Link
          fontWeight="bold"
          color={color}
          px={2}
          py={1}
          rounded={"md"}
          _hover={{
            textDecoration: "none",
            bg,
          }}
          border="1px solid"
        >
          {children}
        </Link>
      </NextLink>
    );
  }

  return (
    <NextLink href={href} passHref>
      <Link
        px={2}
        py={1}
        rounded={"md"}
        _hover={{
          textDecoration: "none",
          bg,
        }}
      >
        {children}
      </Link>
    </NextLink>
  );
};

const NavBar = function () {
  const { colorMode, toggleColorMode } = useColorMode();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isAuthenticated } = usePersistStore();
  return (
    <>
      <Flex as="header" position="fixed" w="100%" top={0} zIndex={1000}>
        <Box w="100%" bg={useColorModeValue("gray.100", "gray.900")} px={4}>
          <Flex h={16} alignItems={"center"} justifyContent={"space-between"}>
            <IconButton
              size={"md"}
              icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
              aria-label={"Open Menu"}
              display={{ md: "none" }}
              onClick={isOpen ? onClose : onOpen}
            />
            <HStack spacing={8} alignItems={"center"}>
              <NextLink href="/" passHref>
                <Box cursor="pointer" p={2}>
                  <HStack>
                    <Logo />
                    <Heading size="md">dArchive</Heading>
                  </HStack>
                </Box>
              </NextLink>

              <HStack
                as={"nav"}
                spacing={4}
                display={{ base: "none", md: "flex" }}
              >
                {isAuthenticated &&
                  NavItems.map((navItem) => (
                    <NavLink key={navItem.key} href={navItem.href as string}>
                      {navItem.label}
                    </NavLink>
                  ))}
              </HStack>
            </HStack>
            <Flex alignItems={"center"}>
              <Stack direction={"row"} spacing={3}>
                <OthentLogin
                  apiid={process.env.NEXT_PUBLIC_OTHENT_API_ID as string}
                  location={ModalLocation["bottom-left"]}
                />
                <Button onClick={toggleColorMode} mr={3}>
                  {colorMode === "light" ? <MoonIcon /> : <SunIcon />}
                </Button>
              </Stack>
            </Flex>
          </Flex>

          {isOpen ? (
            <Box pb={4} display={{ md: "none" }}>
              <Stack as={"nav"} spacing={4}>
                {isAuthenticated &&
                  NavItems.map((navItem) => (
                    <NavLink key={navItem.key} href={navItem.href as string}>
                      {navItem.label}
                    </NavLink>
                  ))}
              </Stack>
            </Box>
          ) : null}
        </Box>
      </Flex>
    </>
  );
};

export default NavBar;
