"use client";

import {
  FormControl,
  FormLabel,
  FormErrorMessage,
  Button,
  Input,
  Container,
  Center,
  Progress,
  Box,
  Link,
  VStack,
  Table,
  TableContainer,
  Tbody,
  Text,
  Td,
  Tr,
  HStack,
  IconButton,
} from "@chakra-ui/react";
import { useToast } from "@chakra-ui/react";
import isURL from "validator/lib/isURL";
import { Formik, Form, Field, FormikValues, FormikState } from "formik";
import { ModalLocation, OthentLogin } from "@/components/othent";
import { useState } from "react";
import {
  ArchiveType,
  formatDate,
  getAccessToken,
  getErrorMessage,
} from "@/lib/utils";
import { usePersistStore } from "@/lib/store";
import { CloseIcon } from "@chakra-ui/icons";

interface MyFormValues {
  url: string;
}

const Archive = () => {
  const defaultArchive = {
    id: "",
    url: "",
    title: "",
    webpage: "",
    screenshot: "",
    timestamp: 0,
  };
  const { userData } = usePersistStore();
  const toast = useToast();
  const initialValues: MyFormValues = { url: "" };
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = usePersistStore();
  const [archive, setArchive] = useState<ArchiveType>(defaultArchive);

  function validateURL(value: string) {
    return isURL(value) ? undefined : "Invalid URL";
  }

  async function archiveUrl(url: string) {
    try {
      setArchive(defaultArchive);
      const accessToken = await getAccessToken();
      const address = userData?.contract_id;
      const response = await fetch("/api/archive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, accessToken, address }),
      });
      const responseJSON = await response.json();
      const { txID, title, timestamp } = responseJSON.data;
      setArchive({
        id: txID,
        title,
        timestamp,
        url,
        webpage: `https://arweave.net/${txID}`,
        screenshot: `https://arweave.net/${txID}/screenshot`,
      });
    } catch (error) {
      console.trace(error);
      toast({
        title: getErrorMessage(error),
        status: "error",
        position: "top-right",
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = async (
    values: FormikValues,
    actions: {
      setSubmitting: (isSubmitting: boolean) => void;
    }
  ) => {
    setIsLoading(true);
    const { url } = values;
    try {
      await archiveUrl(url);
    } catch (e) {
      console.log(getErrorMessage(e));
    } finally {
      setIsLoading(false);
      actions.setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "60vh",
        flex: "1",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Container>
        <Box
          borderWidth="1px"
          borderRadius="lg"
          boxShadow="lg"
          overflow="hidden"
          p={6}
        >
          <Formik initialValues={initialValues} onSubmit={handleSubmit}>
            {(props: { isSubmitting: any }) => (
              <Form>
                <Field name="url" validate={validateURL}>
                  {({
                    field,
                    form,
                  }: {
                    field: { name: string; value: string };
                    form: FormikState<MyFormValues>;
                  }) => (
                    <FormControl
                      isInvalid={!!form.errors.url && !!form.touched.url}
                    >
                      <FormLabel>Archive URL content</FormLabel>
                      <Input {...field} placeholder="URL to archive" />
                      <FormErrorMessage>{form.errors.url}</FormErrorMessage>
                    </FormControl>
                  )}
                </Field>
                {isLoading && (
                  <Progress size="xs" isIndeterminate hasStripe isAnimated />
                )}
                <Center>
                  {isAuthenticated ? (
                    <Button
                      mt={4}
                      colorScheme="blue"
                      isLoading={props.isSubmitting || isLoading}
                      type="submit"
                      isDisabled={!isAuthenticated}
                    >
                      Archive
                    </Button>
                  ) : (
                    <div
                      style={{
                        marginTop: "15px",
                      }}
                    >
                      <OthentLogin
                        apiid={process.env.NEXT_PUBLIC_OTHENT_API_ID as string}
                        location={ModalLocation["bottom-left"]}
                      />
                    </div>
                  )}
                </Center>
              </Form>
            )}
          </Formik>
        </Box>

        {!isLoading && archive.id && (
          <VStack mt="30px">
            <HStack>
              <Text color="green" fontWeight="bold">
                Archived Result
              </Text>
              <IconButton
                colorScheme="red"
                aria-label="Clear Result"
                size="sm"
                icon={<CloseIcon />}
                onClick={() => setArchive(defaultArchive)}
              />
            </HStack>
            <TableContainer>
              <Table variant="striped">
                <Tbody>
                  <Tr>
                    <Td>Url</Td>
                    <Td>
                      <Link href={archive.url} color="blue" isExternal>
                        {archive.url}
                      </Link>
                    </Td>
                  </Tr>
                  <Tr>
                    <Td>Title</Td>
                    <Td>{archive.title}</Td>
                  </Tr>
                  <Tr>
                    <Td>Archived Webpage</Td>
                    <Td>
                      <Link href={archive.webpage} color="blue" isExternal>
                        {archive.webpage}
                      </Link>
                    </Td>
                  </Tr>
                  <Tr>
                    <Td>Screenshot</Td>
                    <Td>
                      <Link href={archive.screenshot} color="blue" isExternal>
                        {archive.screenshot}
                      </Link>
                    </Td>
                  </Tr>
                  <Tr>
                    <Td>Timestamp</Td>
                    <Td>{formatDate(archive.timestamp)}</Td>
                  </Tr>
                </Tbody>
              </Table>
            </TableContainer>
          </VStack>
        )}
      </Container>
    </div>
  );
};

export default Archive;
