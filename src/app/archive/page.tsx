'use client'

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
  Alert,
  AlertIcon,
  Link,
} from "@chakra-ui/react";
import { useToast } from "@chakra-ui/react";
import isURL from "validator/lib/isURL";
import { Formik, Form, Field, FormikValues, FormikState } from "formik";
import { ModalLocation, OthentLogin } from "@/components/othent";
import { useState } from "react";
import NextLink from "next/link";
import { getAccessToken, getErrorMessage} from "@/lib/utils";
import { usePersistStore } from "@/lib/store";

interface MyFormValues {
  url: string;
}


interface IArchive {
  id: string;
  timestamp: string;
  title: string;
  txID: string;
  contentURL: string;
}

const Archive = () => {
  const {userData} = usePersistStore()
  const toast = useToast();
  const initialValues: MyFormValues = { url: "" };
  const [isLoading, setIsLoading] = useState(false);
  const [txID, setTxID] = useState("");
  const {isAuthenticated} =  usePersistStore()
  const [archive, setArchive] = useState<IArchive>({
    id: "",
    title: "",
    txID: "",
    timestamp: "",
    contentURL: "",
  });

  function validateURL(value: string) {
    return isURL(value) ? undefined : "Invalid URL";
  }

  async function archiveUrl(url: string) {
    try {
      const accessToken = await getAccessToken()
      const address = userData?.contract_id;
      const response = await fetch(
        "/api/archive",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url, accessToken, address}),
        }
      );
      const responseJSON = await response.json();
      console.log(responseJSON);
    } catch (error) {
      console.error(error);
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
      }}>
    <Container>
      <Box
        borderWidth="1px"
        borderRadius="lg"
        boxShadow="lg"
        overflow="hidden"
        p={6}
      >
        <Formik initialValues={initialValues} onSubmit={handleSubmit}>
          {(props: { isSubmitting: any; }) => (
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
                    Save
                  </Button>
                ) : (
                  <div
                    style={{
                      marginTop: "15px",
                    }}
                  >
                    <OthentLogin apiid={process.env.NEXT_PUBLIC_OTHENT_API_ID as string} location={ModalLocation["bottom-left"]}/>
                  </div>
                )}
              </Center>
            </Form>
          )}
        </Formik>
      </Box>

      {!isLoading && txID && (
        <Alert status="info">
          <AlertIcon />
          <NextLink href={"/search/" + txID}>
            <Link>See archived result</Link>
          </NextLink>
        </Alert>
      )}
    </Container>
    </div>
  );
};


export default Archive;
