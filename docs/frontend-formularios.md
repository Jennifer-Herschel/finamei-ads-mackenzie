# Formulários no frontend: erros e mensagens (ONF01, ONF02)

Toda tela com formulário usa as mesmas peças, para que os erros apareçam do mesmo jeito no app inteiro: sempre no campo com problema, dizendo como corrigir, em português simples e sem códigos técnicos.

## Peças

| Peça | Onde | Para que serve |
|---|---|---|
| `TextField` | `src/components/TextField.tsx` | Campo com rótulo, dica e mensagem de erro. Destaca o campo em vermelho e liga a mensagem ao campo para leitores de tela. |
| `FormAlert` | `src/components/FormAlert.tsx` | Mensagem sobre o formulário inteiro (erro de conexão, sucesso ao salvar). O erro recebe o foco. |
| `applyApiFieldErrors` | `src/lib/form-errors.ts` | Copia os `fieldErrors` do backend (400 `VALIDATION_ERROR`) para os campos do formulário e foca o primeiro. |
| `getApiErrorMessage` | `src/lib/api-error.ts` | Mensagem amigável para os demais erros (sessão expirada, sem conexão, erro inesperado). |
| `configureZod` | `src/lib/zod-config.ts` | Mensagens padrão em português simples para regras de validação sem mensagem própria. |

## Exemplo

```tsx
const {
  register,
  handleSubmit,
  setError,
  formState: { errors },
} = useForm<TransactionFormValues>({ resolver: zodResolver(transactionSchema) })
const [formError, setFormError] = useState<string | null>(null)

const onSubmit = handleSubmit((values) => {
  setFormError(null)
  mutation.mutate(values, {
    onError: (error) => {
      // Erros por campo vindos do backend; se não houver, mostra um erro geral.
      if (!applyApiFieldErrors(error, TRANSACTION_FIELDS, setError)) {
        setFormError(getApiErrorMessage(error))
      }
    },
  })
})

return (
  <form noValidate onSubmit={onSubmit} className="space-y-5">
    {formError && <FormAlert tone="error">{formError}</FormAlert>}
    <TextField
      label="Valor"
      inputMode="decimal"
      hint="Use vírgula para os centavos."
      error={errors.amount?.message}
      {...register('amount')}
    />
  </form>
)
```

## Regras para as mensagens

- Diga **qual campo** e **como corrigir**: "O valor deve ser maior que zero.", e não "Valor inválido".
- Escreva cada mensagem no próprio schema Zod (`z.string().min(1, 'Informe a descrição.')`). As mensagens padrão de `configureZod` são só uma rede de segurança.
- Nunca mostre ao usuário status HTTP, nomes de exceção ou textos em inglês. Para erros sem mensagem do backend, use `getApiErrorMessage`.
- As chaves de `fieldErrors` são os nomes em inglês dos campos do DTO (`amount`, `email`). Use os mesmos nomes nos campos do formulário para `applyApiFieldErrors` encontrá-los.
