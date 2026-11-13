#include <stdio.h>

int OBTENER_RESULTADO(void);

int main()
{
    printf("RESULTADO=%d\n", OBTENER_RESULTADO());
}

int RESTAR(int A, int B);

int OBTENER_RESULTADO(void)
{
    return RESTAR(70, 18);
}

int RESTAR(int A, int B)
{
    return A - B;
}
