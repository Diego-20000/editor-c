#include <stdio.h>
int main()
{
    int i, x, may;
    for (i = 1; i <= 5; i++)
    {
        scanf("%d", &x);
        if (i == 1 || x > may) may = x;
    }
    printf("%d\n", may);
    return 0;
}
