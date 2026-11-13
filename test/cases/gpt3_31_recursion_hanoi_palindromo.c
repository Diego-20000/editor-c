#include <stdio.h>
#include <string.h>

void HANOI(int N, char ORIGEN, char AUXILIAR, char DESTINO)
{
    if (N == 1)
    {
        printf("%c -> %c\n", ORIGEN, DESTINO);
        return;
    }

    HANOI(N - 1, ORIGEN, DESTINO, AUXILIAR);

    printf("%c -> %c\n", ORIGEN, DESTINO);

    HANOI(N - 1, AUXILIAR, ORIGEN, DESTINO);
}

int ES_PALINDROMO(char TEXTO[], int I, int J)
{
    if (I >= J)
    {
        return 1;
    }

    if (TEXTO[I] != TEXTO[J])
    {
        return 0;
    }

    return ES_PALINDROMO(TEXTO, I + 1, J - 1);
}

int main()
{
    char A[] = "NEUQUEN";
    char B[] = "SENSOR";

    printf("HANOI:\n");
    HANOI(3, 'A', 'B', 'C');

    printf("A=%d\n",
           ES_PALINDROMO(A, 0, (int)strlen(A) - 1));

    printf("B=%d\n",
           ES_PALINDROMO(B, 0, (int)strlen(B) - 1));
}
