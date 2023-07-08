import { useDashboardState } from "@/hooks";
import {
  MediaQuery,
  Header,
  Burger,
  Group,
  Title,
  useMantineTheme
} from "@mantine/core";
import Link from "next/link";

export const DashboardHeader: React.FC = () => {
  const theme = useMantineTheme();
  const { navbarIsOpen, setNavbarOpen } = useDashboardState();

  return (
    <Header height={{ base: 50, md: 70 }} p="md">
      <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
        <MediaQuery largerThan="sm" styles={{ display: "none" }}>
          <Burger
            opened={navbarIsOpen}
            onClick={() => {
              setNavbarOpen(!navbarIsOpen);
            }}
            size="sm"
            color={theme.colors.gray[6]}
            mr="xl"
          />
        </MediaQuery>

        <Group>
          <Link
            href="/"
            passHref
            style={{ textDecoration: "none", color: "black" }}
          >
            <Title order={2}>Plutomi</Title>
          </Link>
        </Group>
      </div>
    </Header>
  );
};
